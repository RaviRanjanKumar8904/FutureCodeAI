import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  User, 
  Users, 
  ExternalLink, 
  ClipboardCheck, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  getDocs,
  where
} from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { generateWebinarSchedule, formatDateShort } from '../../utils/webinarSchedule';
import { DashboardSkeleton, DashboardError } from '../layout/DashboardState';

interface WebinarItem {
  id: string;
  title: string;
  topic?: string;
  speaker?: string;
  startDate: string;
  endDate?: string;
  totalDays: number;
  maxSeats?: number;
  time?: string;
  meetingLink?: string;
  assignedStaff?: string;
  assignedStaffEmail?: string;
  assignedCenter?: string;
  location?: string;
  status: 'Upcoming' | 'Live' | 'Completed';
  postponedDates?: string[];
  postponements?: Record<string, { reason?: string }>;
}

export default function StaffSchedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [webinars, setWebinars] = useState<WebinarItem[]>([]);
  const [attendeeCounts, setAttendeeCounts] = useState<Record<string, number>>({});
  const [filterStatus, setFilterStatus] = useState<'All' | 'Upcoming' | 'Live' | 'Completed'>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const staffEmail = (user?.email || '').toLowerCase().trim();
  const staffName = (user?.displayName || '').toLowerCase().trim();
  const staffCenter = (user?.assignedCenter || user?.school || user?.city || '').toLowerCase().trim();

  // 1. Live listener for webinars
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, 'webinars'), orderBy('createdAt', 'desc')),
      async (snapshot) => {
        const allWebinars = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || '',
            topic: data.topic || '',
            speaker: data.speaker || '',
            startDate: data.startDate || data.date || new Date().toISOString().split('T')[0],
            endDate: data.endDate,
            totalDays: data.totalDays || 15,
            maxSeats: data.maxSeats || 100,
            time: data.time || '10:00 AM - 11:30 AM',
            meetingLink: data.meetingLink || '',
            assignedStaff: data.assignedStaff || '',
            assignedStaffEmail: data.assignedStaffEmail || '',
            assignedCenter: data.assignedCenter || '',
            location: data.location || 'FutureCode AI Tech Center',
            status: data.status || 'Live',
            postponedDates: data.postponedDates || [],
            postponements: data.postponements || {},
          } as WebinarItem;
        });

        // Filter webinars scoped to this staff member:
        // Match if assignedStaff equals email/name, or speaker matches name, or assigned center matches, or if general staff access
        const scoped = allWebinars.filter(w => {
          const assigned = (w.assignedStaff || '').toLowerCase();
          const assignedEmail = (w.assignedStaffEmail || '').toLowerCase();
          const speaker = (w.speaker || '').toLowerCase();
          const center = (w.assignedCenter || '').toLowerCase();

          const isDirectlyAssigned = 
            (assigned && (assigned.includes(staffEmail) || (staffName && assigned.includes(staffName)))) ||
            (assignedEmail && assignedEmail.includes(staffEmail)) ||
            (speaker && staffName && (speaker.includes(staffName) || staffName.includes(speaker)));

          const isCenterAssigned = staffCenter && center && (center.includes(staffCenter) || staffCenter.includes(center));

          // If no specific staff assignment on the webinar, show in general staff roster
          const isGeneral = !w.assignedStaff && !w.assignedStaffEmail;

          return isDirectlyAssigned || isCenterAssigned || isGeneral;
        });

        setWebinars(scoped);
        setLoading(false);

        // Fetch attendee counts
        try {
          const counts: Record<string, number> = {};
          await Promise.all(
            scoped.slice(0, 15).map(async (w) => {
              const snap = await getDocs(query(collection(db, 'webinar_attendees'), where('webinarId', '==', w.id)));
              counts[w.id] = snap.docs.length;
            })
          );
          setAttendeeCounts(counts);
        } catch (e) {
          console.warn('Error fetching attendee counts for schedule:', e);
        }
      },
      (err) => {
        console.error('Error fetching staff schedule:', err);
        setError('Failed to retrieve your assigned teaching schedule.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [staffEmail, staffName, staffCenter]);

  // Compute next session dates for all webinars
  const sessionsWithTimeline = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    return webinars.map(w => {
      const scheduleInfo = generateWebinarSchedule(
        w.startDate,
        w.totalDays || 15,
        w.postponedDates || [],
        w.postponements || {}
      );

      // Find upcoming session date (today or next active date)
      const nextDate = scheduleInfo.activeDates.find(d => d >= today) || scheduleInfo.activeDates[scheduleInfo.activeDates.length - 1] || w.startDate;
      const dayIndex = scheduleInfo.activeDates.indexOf(nextDate) + 1;
      const isToday = nextDate === today;

      return {
        ...w,
        scheduleInfo,
        nextDate,
        dayIndex: dayIndex > 0 ? dayIndex : 1,
        isToday,
        enrolledCount: attendeeCounts[w.id] || 0,
      };
    });
  }, [webinars, attendeeCounts]);

  const filteredSessions = useMemo(() => {
    if (filterStatus === 'All') return sessionsWithTimeline;
    return sessionsWithTimeline.filter(s => s.status === filterStatus);
  }, [sessionsWithTimeline, filterStatus]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-text-heading">Your Teaching Schedule</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Loading assigned classes and sessions...</p>
        </div>
        <DashboardSkeleton type="cards" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <DashboardError
        title="Unable to load class schedule"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <CalendarDays size={13} />
              <span>Assigned Instructor: {user?.displayName || 'Staff Member'}</span>
            </span>
            <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Live Curriculum
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Assigned Teaching Sessions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            View your upcoming multi-day bootcamps, lecture timings, and launch live roll-call desks.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto">
          {(['All', 'Live', 'Upcoming', 'Completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === tab
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Class Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <CalendarDays size={28} />
          </div>
          <h3 className="text-lg font-black text-slate-900">No Assigned Sessions in this Category</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            You do not currently have any sessions matching the selected filter. As administrators assign you to new cohorts, they will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredSessions.map((session, idx) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`bg-white rounded-3xl p-5 sm:p-6 border shadow-xs transition-all flex flex-col justify-between space-y-5 ${
                session.isToday
                  ? 'border-primary ring-2 ring-primary/10'
                  : 'border-slate-200/80 hover:border-purple-300'
              }`}
            >
              <div className="space-y-3">
                {/* Top Status Badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                      {session.totalDays}-Day Bootcamp
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                      session.status === 'Live' ? 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse' :
                      session.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                      'bg-indigo-100 text-indigo-700 border-indigo-200'
                    }`}>
                      {session.status === 'Live' ? '● Live' : session.status}
                    </span>
                    {session.isToday && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs">
                        <Sparkles size={11} />
                        <span>Today&apos;s Class</span>
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-extrabold text-slate-500 flex items-center gap-1">
                    <Users size={14} className="text-primary" />
                    <span>{session.enrolledCount} Enrolled</span>
                  </span>
                </div>

                {/* Title & Topic */}
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-snug">
                    {session.title}
                  </h3>
                  {session.topic && (
                    <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">
                      {session.topic}
                    </p>
                  )}
                </div>

                {/* Session Meta Details */}
                <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold flex items-center gap-1.5">
                      <Calendar size={14} className="text-purple-600" />
                      <span>Next Session</span>
                    </span>
                    <span className="font-extrabold text-slate-900">
                      Day {session.dayIndex}: {formatDateShort(session.nextDate)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" />
                      <span>Class Timing</span>
                    </span>
                    <span className="font-bold text-slate-800">{session.time || '10:00 AM - 12:00 PM'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold flex items-center gap-1.5">
                      <MapPin size={14} className="text-rose-500" />
                      <span>Campus / Room</span>
                    </span>
                    <span className="font-bold text-slate-800 truncate max-w-[180px]">
                      {session.location || 'FutureCode AI Tech Center'}
                    </span>
                  </div>

                  {session.speaker && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 font-bold flex items-center gap-1.5">
                        <User size={14} className="text-indigo-600" />
                        <span>Lead Instructor</span>
                      </span>
                      <span className="font-bold text-slate-900">{session.speaker}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/staff/attendance')}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <ClipboardCheck size={15} />
                  <span>Mark Attendance</span>
                </button>

                {session.meetingLink ? (
                  <a
                    href={session.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <ExternalLink size={14} />
                    <span>Join Class</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/staff/attendance')}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <span>View Roster</span>
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
