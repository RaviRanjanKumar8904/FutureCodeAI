import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  Calendar, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Users, 
  CheckCheck, 
  Building2, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { db } from '../../firebase/config';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch, 
  serverTimestamp,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { generateWebinarSchedule, formatDateShort, formatDateFull } from '../../utils/webinarSchedule';
import { sendNotification } from '../../utils/notificationService';
import { DashboardSkeleton, DashboardError } from '../layout/DashboardState';
import ConfirmModal from '../admin/ConfirmModal';

interface WebinarItem {
  id: string;
  title: string;
  topic?: string;
  startDate: string;
  totalDays: number;
  status: 'Upcoming' | 'Live' | 'Completed';
  postponedDates?: string[];
  postponements?: Record<string, { reason?: string }>;
}

interface WebinarAttendee {
  id: string;
  webinarId?: string;
  webinarTitle: string;
  studentName: string;
  email: string;
  phone?: string;
  collegeName?: string;
  branch?: string;
  dailyAttendance: Record<string, 'Present' | 'Absent'>;
  status?: string;
}

export default function StaffAttendance() {
  const { user } = useAuth();
  const [webinars, setWebinars] = useState<WebinarItem[]>([]);
  const [selectedWebinarId, setSelectedWebinarId] = useState<string>('');
  const [attendees, setAttendees] = useState<WebinarAttendee[]>([]);
  const [activeDate, setActiveDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Present' | 'Absent' | 'Unmarked'>('All');
  const [loadingWebinars, setLoadingWebinars] = useState(true);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const staffCenter = user?.assignedCenter || user?.school || user?.city || 'General Center';

  // 1. Fetch available bootcamps & live webinars
  useEffect(() => {
    setLoadingWebinars(true);
    const unsub = onSnapshot(
      query(collection(db, 'webinars'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || '',
            topic: data.topic || '',
            startDate: data.startDate || data.date || new Date().toISOString().split('T')[0],
            totalDays: data.totalDays || 15,
            status: data.status || 'Live',
            postponedDates: data.postponedDates || [],
            postponements: data.postponements || {},
          } as WebinarItem;
        });

        setWebinars(list);
        if (list.length > 0) {
          setSelectedWebinarId(prev => prev || list[0].id);
        }
        setLoadingWebinars(false);
      },
      (err) => {
        console.error('Error fetching webinars for staff:', err);
        setError('Failed to load active bootcamps and classes.');
        setLoadingWebinars(false);
      }
    );

    return () => unsub();
  }, []);

  const selectedWebinar = useMemo(() => {
    return webinars.find(w => w.id === selectedWebinarId) || webinars[0] || null;
  }, [webinars, selectedWebinarId]);

  // Compute schedule dates for selected webinar
  const scheduleInfo = useMemo(() => {
    if (!selectedWebinar) return { schedule: [], activeDates: [] as string[], endDate: '' };
    return generateWebinarSchedule(
      selectedWebinar.startDate,
      selectedWebinar.totalDays || 15,
      selectedWebinar.postponedDates || [],
      selectedWebinar.postponements || {}
    );
  }, [selectedWebinar]);

  // Default activeDate to today if in schedule, else first active date
  useEffect(() => {
    if (scheduleInfo.activeDates.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    if (scheduleInfo.activeDates.includes(today)) {
      setActiveDate(today);
    } else if (!scheduleInfo.activeDates.includes(activeDate)) {
      setActiveDate(scheduleInfo.activeDates[0]);
    }
  }, [scheduleInfo.activeDates, activeDate]);

  // 2. Fetch attendees for the selected webinar (scoped to staff center if applicable)
  const fetchAttendees = useCallback(async () => {
    if (!selectedWebinar) return;
    setLoadingAttendees(true);

    try {
      const q = query(
        collection(db, 'webinar_attendees'),
        where('webinarId', '==', selectedWebinar.id)
      );

      const snapshot = await getDocs(q);
      let list = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        dailyAttendance: d.data().dailyAttendance || {},
      })) as WebinarAttendee[];

      // If staff has a specific center assigned, prioritize center matching
      if (staffCenter && staffCenter !== 'General Center' && staffCenter !== 'All Centers') {
        const centerFiltered = list.filter(a => {
          const college = (a.collegeName || '').toLowerCase();
          const target = staffCenter.toLowerCase();
          return college.includes(target) || (a as any).assignedCenter?.toLowerCase()?.includes(target);
        });
        if (centerFiltered.length > 0) {
          list = centerFiltered;
        }
      }

      setAttendees(list);
    } catch (err) {
      console.error('Error fetching attendees:', err);
      toast.error('Failed to load attendee roster');
    } finally {
      setLoadingAttendees(false);
    }
  }, [selectedWebinar, staffCenter]);

  useEffect(() => {
    fetchAttendees();
  }, [fetchAttendees]);

  // 1-Click Toggle Daily Attendance for Single Attendee
  const handleToggleAttendance = async (attendee: WebinarAttendee, dateStr: string) => {
    const currentStatus = attendee.dailyAttendance?.[dateStr];
    const newStatus: 'Present' | 'Absent' = currentStatus === 'Present' ? 'Absent' : 'Present';

    const updatedDaily: Record<string, 'Present' | 'Absent'> = {
      ...(attendee.dailyAttendance || {}),
      [dateStr]: newStatus,
    };

    // Optimistic UI update
    setAttendees(prev => prev.map(a => a.id === attendee.id ? { ...a, dailyAttendance: updatedDaily } : a));

    try {
      await updateDoc(doc(db, 'webinar_attendees', attendee.id), {
        dailyAttendance: updatedDaily,
        updatedAt: serverTimestamp(),
      });

      if (newStatus === 'Present' && attendee.email) {
        sendNotification({
          userId: attendee.id,
          userEmail: attendee.email,
          title: 'Attendance Marked Present ✅',
          message: `Your staff instructor recorded your attendance for "${selectedWebinar?.title || 'Bootcamp'}" on ${formatDateShort(dateStr)}.`,
          type: 'attendance',
          link: '/dashboard/student/webinars',
        });
      }

      toast.success(`${attendee.studentName} marked ${newStatus}`);
    } catch (err) {
      console.error('Error updating attendance:', err);
      toast.error('Failed to update attendance');
      // Rollback
      setAttendees(prev => prev.map(a => a.id === attendee.id ? attendee : a));
    }
  };

  // Mark all filtered attendees Present for the active date
  const handleMarkAllPresent = async () => {
    if (!selectedWebinar || filteredAttendees.length === 0) return;

    setConfirmModalState({
      isOpen: true,
      title: `Mark All ${filteredAttendees.length} Students Present?`,
      message: `Are you sure you want to mark all ${filteredAttendees.length} visible student(s) as Present on ${formatDateFull(activeDate)}?`,
      onConfirm: async () => {
        const toastId = toast.loading(`Marking ${filteredAttendees.length} students present…`);
        try {
          const batch = writeBatch(db);
          filteredAttendees.forEach(a => {
            const updated = { ...(a.dailyAttendance || {}), [activeDate]: 'Present' as const };
            batch.update(doc(db, 'webinar_attendees', a.id), {
              dailyAttendance: updated,
              updatedAt: serverTimestamp(),
            });

            if (a.email) {
              sendNotification({
                userId: a.id,
                userEmail: a.email,
                title: 'Attendance Marked Present ✅',
                message: `Your staff instructor marked you Present for "${selectedWebinar.title}" on ${formatDateShort(activeDate)}.`,
                type: 'attendance',
                link: '/dashboard/student/webinars',
              });
            }
          });

          await batch.commit();
          toast.success(`Marked ${filteredAttendees.length} students Present on ${formatDateShort(activeDate)}!`, { id: toastId });
          fetchAttendees();
        } catch (err) {
          console.error('Error in bulk attendance:', err);
          toast.error('Failed to mark all present', { id: toastId });
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Day Navigation helper
  const handleNavigateDay = (direction: 'prev' | 'next') => {
    const currentIndex = scheduleInfo.activeDates.indexOf(activeDate);
    if (currentIndex === -1) return;
    if (direction === 'prev' && currentIndex > 0) {
      setActiveDate(scheduleInfo.activeDates[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < scheduleInfo.activeDates.length - 1) {
      setActiveDate(scheduleInfo.activeDates[currentIndex + 1]);
    }
  };

  // Filtered attendees
  const filteredAttendees = useMemo(() => {
    return attendees.filter(a => {
      const name = (a.studentName || '').toLowerCase();
      const email = (a.email || '').toLowerCase();
      const college = (a.collegeName || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      const matchesSearch = name.includes(search) || email.includes(search) || college.includes(search);

      if (!matchesSearch) return false;

      const currentStatus = a.dailyAttendance?.[activeDate];
      if (statusFilter === 'Present') return currentStatus === 'Present';
      if (statusFilter === 'Absent') return currentStatus === 'Absent';
      if (statusFilter === 'Unmarked') return !currentStatus;
      return true;
    });
  }, [attendees, searchTerm, statusFilter, activeDate]);

  // Attendance metrics for today
  const presentCountToday = attendees.filter(a => a.dailyAttendance?.[activeDate] === 'Present').length;
  const absentCountToday = attendees.filter(a => a.dailyAttendance?.[activeDate] === 'Absent').length;
  const unmarkedCountToday = attendees.length - presentCountToday - absentCountToday;
  const attendanceRateToday = attendees.length > 0 ? Math.round((presentCountToday / attendees.length) * 100) : 0;

  if (loadingWebinars) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-text-heading">Staff Attendance Management</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Loading cohorts and active classes...</p>
        </div>
        <DashboardSkeleton type="cards" count={3} />
        <DashboardSkeleton type="table" count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <DashboardError
        title="Unable to load attendance portal"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
              <Building2 size={13} />
              <span>Center: {staffCenter}</span>
            </span>
            <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Live Attendance Desk
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Class &amp; Bootcamp Attendance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Mark daily attendance for enrolled candidates and sync student verified records in real time.
          </p>
        </div>

        {/* Bootcamp Session Picker */}
        <div className="w-full md:w-72 space-y-1">
          <label className="text-xs font-bold text-slate-600 block">
            Select Class / Bootcamp:
          </label>
          <select
            value={selectedWebinarId}
            onChange={(e) => setSelectedWebinarId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-xs"
          >
            {webinars.map(w => (
              <option key={w.id} value={w.id}>
                {w.title} ({w.totalDays} Days)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-extrabold uppercase">Total Enrolled</span>
            <Users size={16} className="text-primary" />
          </div>
          <span className="text-2xl font-black text-slate-900">{attendees.length}</span>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Students in this cohort</p>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-emerald-500 mb-1">
            <span className="text-xs font-extrabold uppercase text-slate-400">Present Today</span>
            <CheckCircle2 size={16} />
          </div>
          <span className="text-2xl font-black text-emerald-600">{presentCountToday}</span>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">{attendanceRateToday}% presence rate</p>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-rose-500 mb-1">
            <span className="text-xs font-extrabold uppercase text-slate-400">Absent Today</span>
            <XCircle size={16} />
          </div>
          <span className="text-2xl font-black text-rose-600">{absentCountToday}</span>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Marked absent</p>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <span className="text-xs font-extrabold uppercase text-slate-400">Unmarked</span>
            <ClipboardList size={16} />
          </div>
          <span className="text-2xl font-black text-amber-600">{unmarkedCountToday}</span>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Pending roll call</p>
        </div>
      </div>

      {/* Multi-Day Date Selector Ribbon */}
      {selectedWebinar && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              <span className="text-xs sm:text-sm font-black text-slate-900">
                Session Date: <span className="text-primary">{formatDateFull(activeDate)}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleNavigateDay('prev')}
                disabled={scheduleInfo.activeDates.indexOf(activeDate) <= 0}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleNavigateDay('next')}
                disabled={scheduleInfo.activeDates.indexOf(activeDate) >= scheduleInfo.activeDates.length - 1}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {scheduleInfo.schedule.map((item) => {
              const isSelected = item.date === activeDate;
              const isPostponed = item.isPostponed;

              return (
                <button
                  key={item.date}
                  type="button"
                  disabled={isPostponed}
                  onClick={() => !isPostponed && setActiveDate(item.date)}
                  className={`px-3 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                    isPostponed
                      ? 'bg-amber-50 border-amber-200 text-amber-900 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="block text-[10px] uppercase font-bold opacity-80">
                    {isPostponed ? 'Postponed' : item.label}
                  </span>
                  <span>{formatDateShort(item.date)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-4 rounded-3xl border border-slate-200/80">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name, email, college..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full md:w-64"
            />
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
            {(['All', 'Present', 'Absent', 'Unmarked'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleMarkAllPresent}
          disabled={filteredAttendees.length === 0}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <CheckCheck size={16} />
          <span>Mark Visible Present ({filteredAttendees.length})</span>
        </button>
      </div>

      {/* Interactive Attendance Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loadingAttendees ? (
          <div className="p-8 text-center text-slate-500 font-medium">
            <div className="flex justify-center items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span>Loading student attendance matrix…</span>
            </div>
          </div>
        ) : filteredAttendees.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium space-y-2">
            <Users size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-base font-extrabold text-slate-800">No Student Records Found</p>
            <p className="text-xs text-slate-400">Try adjusting your search or active date filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold">
                  <th className="py-3 px-4 pl-6">Student Information</th>
                  <th className="py-3 px-4">College / Center</th>
                  <th className="py-3 px-4 text-center">Cumulative Attendance</th>
                  <th className="py-3 px-4 text-center">Status on {formatDateShort(activeDate)}</th>
                  <th className="py-3 px-4 pr-6 text-right">1-Click Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendees.map((attendee, idx) => {
                  const daily = attendee.dailyAttendance || {};
                  const currentStatus = daily[activeDate];
                  const isPresent = currentStatus === 'Present';
                  const isAbsent = currentStatus === 'Absent';

                  // Calculate total attended out of active dates
                  const totalPresent = scheduleInfo.activeDates.filter(d => daily[d] === 'Present').length;
                  const totalDays = selectedWebinar?.totalDays || 15;
                  const percentage = Math.round((totalPresent / (totalDays > 0 ? totalDays : 1)) * 100);

                  return (
                    <motion.tr
                      key={attendee.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 pl-6">
                        <div className="font-extrabold text-slate-900">{attendee.studentName}</div>
                        <div className="text-xs text-slate-500 font-medium">{attendee.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700 block truncate max-w-[200px]">
                          {attendee.collegeName || staffCenter}
                        </span>
                        {attendee.branch && (
                          <span className="text-[11px] text-slate-400 block">{attendee.branch}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">
                            {totalPresent} / {totalDays}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            percentage >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {percentage}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={13} />
                            <span>Present</span>
                          </span>
                        ) : isAbsent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle size={13} />
                            <span>Absent</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            <span>Unmarked</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 pr-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(attendee, activeDate)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer active:scale-95 shadow-xs ${
                            isPresent
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                          }`}
                        >
                          {isPresent ? (
                            <>
                              <XCircle size={13} />
                              <span>Mark Absent</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={13} />
                              <span>Mark Present</span>
                            </>
                          )}
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        variant="primary"
      />
    </div>
  );
}
