import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  Video, 
  Upload, 
  Download, 
  Plus, 
  HelpCircle, 
  Award, 
  School, 
  Users, 
  CheckCircle2, 
  ArrowLeft, 
  TrendingUp
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { logAdminActivity } from '../../utils/adminLogger';
import { exportCSV, downloadTemplateCSV, parseCSV, resolveHeaderValue } from '../../utils/csv';
import { sendNotification } from '../../utils/notificationService';
import ConfirmModal from '../../components/admin/ConfirmModal';
import { 
  generateWebinarSchedule, 
  formatDateShort, 
  formatDateFull 
} from '../../utils/webinarSchedule';
import type { WebinarItem, WebinarAttendee } from '../../components/admin/webinars/types';
import WebinarCatalog from '../../components/admin/webinars/WebinarCatalog';
import WebinarAttendanceFilters from '../../components/admin/webinars/WebinarAttendanceFilters';
import WebinarAttendanceTable from '../../components/admin/webinars/WebinarAttendanceTable';
import CreateEditWebinarModal from '../../components/admin/webinars/CreateEditWebinarModal';
import WebinarCsvImportModal from '../../components/admin/webinars/WebinarCsvImportModal';
import WebinarCsvGuideModal from '../../components/admin/webinars/WebinarCsvGuideModal';
import AddAttendeeModal from '../../components/admin/webinars/AddAttendeeModal';
import AttendeeDetailModal from '../../components/admin/webinars/AttendeeDetailModal';
import PostponeDayModal from '../../components/admin/webinars/PostponeDayModal';

export default function ManageWebinars() {
  const { user } = useAuth();
  
  // State
  const [webinars, setWebinars] = useState<WebinarItem[]>([]);
  const [attendees, setAttendees] = useState<WebinarAttendee[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Selected Webinar (Drill-down mode)
  const [selectedWebinar, setSelectedWebinar] = useState<WebinarItem | null>(null);

  // Active Selected Day/Date for Daily Attendance
  const [activeDate, setActiveDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceEligibilityFilter, setAttendanceEligibilityFilter] = useState<'All' | 'Confirmed' | 'Waitlisted' | 'Eligible' | 'Ineligible' | 'CertIssued' | 'CertPending'>('All');
  const [selectedCollege, setSelectedCollege] = useState('All');
  const [webinarStatusFilter, setWebinarStatusFilter] = useState<'All' | 'Upcoming' | 'Live' | 'Completed'>('All');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Detailed Student History Modal
  const [detailStudent, setDetailStudent] = useState<WebinarAttendee | null>(null);

  // Day ribbon ref for smooth scrolling
  const dayRibbonRef = useRef<HTMLDivElement>(null);

  // Create / Edit Webinar Modal
  const [showWebinarModal, setShowWebinarModal] = useState(false);
  const [editingWebinar, setEditingWebinar] = useState<WebinarItem | null>(null);
  const [webinarFormData, setWebinarFormData] = useState({
    title: '',
    topic: '',
    speaker: '',
    startDate: new Date().toISOString().split('T')[0],
    totalDays: 15,
    maxSeats: 100,
    time: '05:00 PM - 06:30 PM',
    meetingLink: '',
    formLink: '',
    status: 'Upcoming' as 'Upcoming' | 'Live' | 'Completed',
  });
  const [isSavingWebinar, setIsSavingWebinar] = useState(false);

  // CSV Import Modal & Preview
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [targetWebinarId, setTargetWebinarId] = useState<string>('');
  const [targetWebinarTitle, setTargetWebinarTitle] = useState<string>('');
  const [importAttendanceForDate, setImportAttendanceForDate] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Add Student Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    studentName: '',
    email: '',
    phone: '',
    collegeName: '',
    branch: '',
    yearOfStudy: '',
    webinarId: '',
    webinarTitle: '',
  });
  const [isAdding, setIsAdding] = useState(false);

  // Postpone Modal State
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [postponeDateTarget, setPostponeDateTarget] = useState<string>('');
  const [postponeReason, setPostponeReason] = useState<string>('Instructor Unavailable');
  const [isPostponing, setIsPostponing] = useState(false);

  // Confirm Modal state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'primary',
  });

  // Fetch all webinars and attendees
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [webinarsSnap, attendeesSnap] = await Promise.all([
        getDocs(query(collection(db, 'webinars'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'webinar_attendees'), orderBy('createdAt', 'desc'))),
      ]);

      const webinarsList = webinarsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || '',
          topic: data.topic || '',
          speaker: data.speaker || '',
          startDate: data.startDate || data.date || new Date().toISOString().split('T')[0],
          endDate: data.endDate || '',
          totalDays: data.totalDays || 15,
          maxSeats: data.maxSeats || 100,
          time: data.time || '',
          meetingLink: data.meetingLink || '',
          formLink: data.formLink || '',
          status: data.status || 'Upcoming',
          postponedDates: data.postponedDates || [],
          postponements: data.postponements || {},
          createdAt: data.createdAt,
        } as WebinarItem;
      });
      setWebinars(webinarsList);

      setSelectedWebinar(prev => {
        if (!prev) return null;
        return webinarsList.find(w => w.id === prev.id) || prev;
      });

      const attendeesList = attendeesSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          webinarId: data.webinarId || '',
          webinarTitle: data.webinarTitle || '',
          studentName: data.studentName || '',
          email: data.email || '',
          phone: data.phone || '',
          collegeName: data.collegeName || '',
          branch: data.branch || '',
          yearOfStudy: data.yearOfStudy || '',
          timestamp: data.timestamp || '',
          dailyAttendance: data.dailyAttendance || (data.attendanceStatus === 'Attended' ? { [data.webinarDate || 'Day 1']: 'Present' } : {}),
          certificateIssued: data.certificateIssued || false,
          certificateId: data.certificateId || '',
          certificateIssuedAt: data.certificateIssuedAt,
          status: data.status || 'Confirmed',
          waitlistPosition: data.waitlistPosition,
          promotedAt: data.promotedAt,
          source: data.source || 'manual',
          createdAt: data.createdAt,
        } as WebinarAttendee;
      });
      setAttendees(attendeesList);
    } catch (err) {
      console.error('Error fetching webinars data:', err);
      toast.error('Failed to load webinar data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute full session schedule accounting for postponed days (+1 day per postponement)
  const activeSessionSchedule = useMemo(() => {
    if (!selectedWebinar) return { schedule: [], activeDates: [], endDate: '' };
    return generateWebinarSchedule(
      selectedWebinar.startDate,
      selectedWebinar.totalDays || 15,
      selectedWebinar.postponedDates || [],
      selectedWebinar.postponements || {}
    );
  }, [selectedWebinar]);

  const activeScheduleList = activeSessionSchedule.schedule;
  const activeSessionDates = useMemo(() => activeScheduleList.map(s => s.date), [activeScheduleList]);

  // Keep activeDate within the selected webinar's date range
  useEffect(() => {
    if (selectedWebinar && activeSessionDates.length > 0) {
      if (!activeSessionDates.includes(activeDate)) {
        const today = new Date().toISOString().split('T')[0];
        if (activeSessionDates.includes(today)) {
          setActiveDate(today);
        } else {
          setActiveDate(activeSessionDates[0]);
        }
      }
    }
  }, [selectedWebinar, activeSessionDates, activeDate]);

  // Compute stats per attendee
  const computeAttendeeStats = (attendee: WebinarAttendee, totalDays: number) => {
    const daily = attendee.dailyAttendance || {};
    const presentDays = Object.values(daily).filter(v => v === 'Present').length;
    const days = totalDays > 0 ? totalDays : 1;
    const percentage = Math.round((presentDays / days) * 100);
    const isEligible = percentage >= 75;
    const daysNeededFor75 = Math.max(0, Math.ceil(0.75 * days) - presentDays);

    return { presentDays, totalDays: days, percentage, isEligible, daysNeededFor75 };
  };

  // Compute metrics for each webinar
  const webinarMetrics = useMemo(() => {
    const map = new Map<string, { total: number; eligibleCount: number; certCount: number; colleges: Set<string> }>();
    
    webinars.forEach(w => {
      map.set(w.id, { total: 0, eligibleCount: 0, certCount: 0, colleges: new Set() });
    });

    attendees.forEach(a => {
      let wid = a.webinarId;
      if (!wid) {
        const found = webinars.find(w => w.title.toLowerCase() === a.webinarTitle?.toLowerCase());
        if (found) wid = found.id;
      }

      if (wid && map.has(wid)) {
        const w = webinars.find(item => item.id === wid);
        const stats = map.get(wid)!;
        stats.total++;
        const { isEligible } = computeAttendeeStats(a, w?.totalDays || 15);
        if (isEligible) stats.eligibleCount++;
        if (a.certificateIssued) stats.certCount++;
        if (a.collegeName && a.collegeName !== 'N/A') stats.colleges.add(a.collegeName);
      }
    });

    return map;
  }, [webinars, attendees]);

  // Overall Global Stats
  const globalStats = useMemo(() => {
    const totalWebinars = webinars.length;
    const totalStudents = attendees.length;
    let totalEligible = 0;
    let totalCerts = 0;

    attendees.forEach(a => {
      const w = webinars.find(item => item.id === a.webinarId);
      const { isEligible } = computeAttendeeStats(a, w?.totalDays || 15);
      if (isEligible) totalEligible++;
      if (a.certificateIssued) totalCerts++;
    });

    return { totalWebinars, totalStudents, totalEligible, totalCerts };
  }, [webinars, attendees]);

  // Selected Webinar Attendees
  const attendeesForSelectedWebinar = useMemo(() => {
    if (!selectedWebinar) return [];
    return attendees.filter(a => 
      a.webinarId === selectedWebinar.id || 
      (a.webinarTitle && a.webinarTitle.toLowerCase() === selectedWebinar.title.toLowerCase())
    );
  }, [attendees, selectedWebinar]);

  // Unique Colleges in selected webinar
  const uniqueColleges = useMemo(() => {
    const set = new Set<string>();
    attendeesForSelectedWebinar.forEach(a => {
      if (a.collegeName && a.collegeName.trim() && a.collegeName !== 'N/A') {
        set.add(a.collegeName.trim());
      }
    });
    return Array.from(set).sort();
  }, [attendeesForSelectedWebinar]);

  // Filtered Attendees for Table View
  const displayedAttendees = useMemo(() => {
    if (!selectedWebinar) return [];
    const totalDays = selectedWebinar.totalDays || 15;

    return attendeesForSelectedWebinar.filter(a => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || 
        a.studentName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.phone && a.phone.toLowerCase().includes(q)) ||
        (a.collegeName && a.collegeName.toLowerCase().includes(q));

      const matchCollege = selectedCollege === 'All' || a.collegeName === selectedCollege;

      const { isEligible } = computeAttendeeStats(a, totalDays);
      let matchEligibility = true;

      if (attendanceEligibilityFilter === 'Confirmed') {
        matchEligibility = a.status !== 'Waitlisted';
      } else if (attendanceEligibilityFilter === 'Waitlisted') {
        matchEligibility = a.status === 'Waitlisted';
      } else if (attendanceEligibilityFilter === 'Eligible') {
        matchEligibility = isEligible;
      } else if (attendanceEligibilityFilter === 'Ineligible') {
        matchEligibility = !isEligible;
      } else if (attendanceEligibilityFilter === 'CertIssued') {
        matchEligibility = a.certificateIssued === true;
      } else if (attendanceEligibilityFilter === 'CertPending') {
        matchEligibility = isEligible && !a.certificateIssued;
      }

      return matchSearch && matchCollege && matchEligibility;
    });
  }, [attendeesForSelectedWebinar, selectedWebinar, searchTerm, selectedCollege, attendanceEligibilityFilter]);

  // Filtered webinars list for catalog view
  const filteredWebinars = useMemo(() => {
    return webinars.filter(w => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || 
        w.title.toLowerCase().includes(q) ||
        (w.topic && w.topic.toLowerCase().includes(q)) ||
        (w.speaker && w.speaker.toLowerCase().includes(q));
      
      const matchStatus = webinarStatusFilter === 'All' || w.status === webinarStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [webinars, searchTerm, webinarStatusFilter]);

  // Stats for the active selected webinar
  const selectedWebinarStats = useMemo(() => {
    if (!selectedWebinar) return null;
    const metrics = webinarMetrics.get(selectedWebinar.id) || { total: 0, eligibleCount: 0, certCount: 0, colleges: new Set() };
    const presentOnActiveDate = attendeesForSelectedWebinar.filter(a => a.dailyAttendance?.[activeDate] === 'Present').length;
    const eligibleRate = metrics.total > 0 ? Math.round((metrics.eligibleCount / metrics.total) * 100) : 0;

    return {
      ...metrics,
      presentOnActiveDate,
      eligibleRate,
    };
  }, [selectedWebinar, webinarMetrics, attendeesForSelectedWebinar, activeDate]);

  // Postpone Handlers
  const handleTogglePostponeDay = (dateStr: string, currentIsPostponed: boolean) => {
    if (!selectedWebinar) return;

    if (currentIsPostponed) {
      setConfirmModalState({
        isOpen: true,
        title: 'Resume Postponed Day?',
        message: `Do you want to reactivate ${formatDateFull(dateStr)} as an active teaching day? The bootcamp schedule will contract back by 1 day.`,
        variant: 'primary',
        onConfirm: async () => {
          const toastId = toast.loading('Resuming day...');
          try {
            const updatedPostponedDates = (selectedWebinar.postponedDates || []).filter(d => d !== dateStr);
            const updatedPostponements = { ...(selectedWebinar.postponements || {}) };
            delete updatedPostponements[dateStr];

            const { endDate } = generateWebinarSchedule(
              selectedWebinar.startDate,
              selectedWebinar.totalDays || 15,
              updatedPostponedDates,
              updatedPostponements
            );

            await updateDoc(doc(db, 'webinars', selectedWebinar.id), {
              postponedDates: updatedPostponedDates,
              postponements: updatedPostponements,
              endDate,
              updatedAt: serverTimestamp(),
            });

            const updatedWebinar: WebinarItem = {
              ...selectedWebinar,
              postponedDates: updatedPostponedDates,
              postponements: updatedPostponements,
              endDate,
            };

            setSelectedWebinar(updatedWebinar);
            setWebinars(prev => prev.map(w => w.id === selectedWebinar.id ? updatedWebinar : w));
            await logAdminActivity(user?.email, 'UPDATED', `Resumed day ${dateStr} for ${selectedWebinar.title}`);
            toast.success(`Session on ${formatDateShort(dateStr)} resumed!`, { id: toastId });
          } catch (err) {
            console.error('Error resuming day:', err);
            toast.error('Failed to resume day', { id: toastId });
          } finally {
            setConfirmModalState(prev => ({ ...prev, isOpen: false }));
          }
        }
      });
    } else {
      setPostponeDateTarget(dateStr);
      setPostponeReason('Instructor Unavailable');
      setShowPostponeModal(true);
    }
  };

  const handleConfirmPostpone = async () => {
    if (!selectedWebinar || !postponeDateTarget) return;
    setIsPostponing(true);
    const toastId = toast.loading(`Postponing ${formatDateShort(postponeDateTarget)}...`);

    try {
      const updatedPostponedDates = Array.from(new Set([...(selectedWebinar.postponedDates || []), postponeDateTarget]));
      const updatedPostponements = {
        ...(selectedWebinar.postponements || {}),
        [postponeDateTarget]: {
          reason: postponeReason.trim() || 'Instructor Unavailable',
          postponedAt: new Date().toISOString(),
        }
      };

      const { endDate } = generateWebinarSchedule(
        selectedWebinar.startDate,
        selectedWebinar.totalDays || 15,
        updatedPostponedDates,
        updatedPostponements
      );

      await updateDoc(doc(db, 'webinars', selectedWebinar.id), {
        postponedDates: updatedPostponedDates,
        postponements: updatedPostponements,
        endDate,
        updatedAt: serverTimestamp(),
      });

      const updatedWebinar: WebinarItem = {
        ...selectedWebinar,
        postponedDates: updatedPostponedDates,
        postponements: updatedPostponements,
        endDate,
      };

      setSelectedWebinar(updatedWebinar);
      setWebinars(prev => prev.map(w => w.id === selectedWebinar.id ? updatedWebinar : w));
      await logAdminActivity(user?.email, 'UPDATED', `Postponed day ${postponeDateTarget} (${postponeReason}) for ${selectedWebinar.title}`);
      toast.success(`Session on ${formatDateShort(postponeDateTarget)} postponed. Schedule extended to ${formatDateFull(endDate)}!`, { id: toastId });
      setShowPostponeModal(false);
    } catch (err) {
      console.error('Error postponing day:', err);
      toast.error('Failed to postpone day', { id: toastId });
    } finally {
      setIsPostponing(false);
    }
  };

  // Scroll ribbon helper
  const scrollDayRibbon = (direction: 'left' | 'right') => {
    if (dayRibbonRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      dayRibbonRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Navigate prev / next day
  const handleNavigateDay = (direction: 'prev' | 'next') => {
    const currentIndex = activeSessionDates.indexOf(activeDate);
    if (currentIndex === -1) return;
    if (direction === 'prev' && currentIndex > 0) {
      setActiveDate(activeSessionDates[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < activeSessionDates.length - 1) {
      setActiveDate(activeSessionDates[currentIndex + 1]);
    }
  };

  // 1-Click Toggle Daily Attendance
  const handleToggleDailyAttendance = async (attendee: WebinarAttendee, dateStr: string) => {
    const currentStatus = attendee.dailyAttendance?.[dateStr];
    const newStatus: 'Present' | 'Absent' = currentStatus === 'Present' ? 'Absent' : 'Present';
    
    const updatedDaily: Record<string, 'Present' | 'Absent'> = {
      ...(attendee.dailyAttendance || {}),
      [dateStr]: newStatus,
    };

    setAttendees(prev => prev.map(a => a.id === attendee.id ? { ...a, dailyAttendance: updatedDaily } : a));

    try {
      await updateDoc(doc(db, 'webinar_attendees', attendee.id), {
        dailyAttendance: updatedDaily,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating attendance:', err);
      toast.error('Failed to save attendance toggle');
      setAttendees(prev => prev.map(a => a.id === attendee.id ? attendee : a));
    }
  };

  // Mark all filtered attendees Present on activeDate
  const handleMarkAllPresentOnActiveDate = async () => {
    if (!selectedWebinar || displayedAttendees.length === 0) return;

    setConfirmModalState({
      isOpen: true,
      title: `Mark All ${displayedAttendees.length} Present?`,
      message: `Mark all ${displayedAttendees.length} visible student(s) as Present on ${formatDateFull(activeDate)}?`,
      variant: 'primary',
      onConfirm: async () => {
        const toastId = toast.loading(`Marking ${displayedAttendees.length} present...`);
        try {
          const batch = writeBatch(db);
          displayedAttendees.forEach(a => {
            const updated = { ...(a.dailyAttendance || {}), [activeDate]: 'Present' };
            batch.update(doc(db, 'webinar_attendees', a.id), {
              dailyAttendance: updated,
              updatedAt: serverTimestamp(),
            });
          });

          await batch.commit();
          toast.success(`Marked ${displayedAttendees.length} students Present on ${formatDateShort(activeDate)}!`, { id: toastId });
          await logAdminActivity(user?.email, 'BULK_ACTION', `Marked ${displayedAttendees.length} present on ${activeDate} for ${selectedWebinar.title}`);
          fetchData();
        } catch (err) {
          console.error('Error in bulk present:', err);
          toast.error('Failed to mark all present', { id: toastId });
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Bulk mark selected attendees present on active date
  const handleBulkMarkAttendedActiveDate = async () => {
    if (selectedIds.length === 0) return;
    const toastId = toast.loading(`Marking ${selectedIds.length} present...`);

    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const target = attendees.find(a => a.id === id);
        if (target) {
          const updated = { ...(target.dailyAttendance || {}), [activeDate]: 'Present' };
          batch.update(doc(db, 'webinar_attendees', id), {
            dailyAttendance: updated,
            updatedAt: serverTimestamp(),
          });
        }
      });

      await batch.commit();
      toast.success(`Marked ${selectedIds.length} students present for ${formatDateShort(activeDate)}!`, { id: toastId });
      fetchData();
      setSelectedIds([]);
    } catch (err) {
      console.error('Error in bulk mark present:', err);
      toast.error('Failed to update attendance', { id: toastId });
    }
  };

  // Issue single Certificate
  const handleIssueCertificate = async (attendee: WebinarAttendee) => {
    const webinarTitle = attendee.webinarTitle || selectedWebinar?.title || '15-Day Masterclass';
    const totalDays = selectedWebinar?.totalDays || 15;
    const { percentage } = computeAttendeeStats(attendee, totalDays);
    const certCode = `FCAI-WEB-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    setConfirmModalState({
      isOpen: true,
      title: 'Issue Certificate?',
      message: `Issue Course Completion Certificate to ${attendee.studentName} (${percentage}% attendance in ${webinarTitle})?`,
      variant: 'primary',
      onConfirm: async () => {
        const toastId = toast.loading('Generating certificate...');
        try {
          await addDoc(collection(db, 'certificates'), {
            certificateId: certCode,
            studentName: attendee.studentName,
            studentEmail: attendee.email.toLowerCase().trim(),
            courseName: webinarTitle,
            domain: selectedWebinar?.topic || 'Multi-Day Technical Masterclass',
            type: 'webinar_bootcamp',
            issueDate: new Date().toISOString().split('T')[0],
            grade: percentage >= 90 ? 'A+' : 'A',
            marksPercentage: `${percentage}% Attendance`,
            status: 'issued',
            collegeName: attendee.collegeName || '',
            createdAt: serverTimestamp(),
          });

          await updateDoc(doc(db, 'webinar_attendees', attendee.id), {
            certificateIssued: true,
            certificateId: certCode,
            certificateIssuedAt: serverTimestamp(),
          });

          if (attendee.email) {
            await sendNotification({
              userId: attendee.id,
              userEmail: attendee.email,
              title: `🎓 Webinar Certificate Issued!`,
              message: `Congratulations! Your certificate for ${webinarTitle} is ready.`,
              type: 'certificate',
              link: '/dashboard/student?tab=certificates',
            });
          }

          toast.success(`Certificate ${certCode} issued to ${attendee.studentName}!`, { id: toastId });
          await logAdminActivity(user?.email, 'ISSUED', `Webinar Cert for ${attendee.studentName}`, `ID: ${certCode}`);
          fetchData();
        } catch (err) {
          console.error('Error issuing certificate:', err);
          toast.error('Failed to issue certificate', { id: toastId });
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Bulk Issue Certificates for all >= 75% attendees
  const handleBulkIssueEligibleCertificates = async () => {
    if (!selectedWebinar) return;
    const totalDays = selectedWebinar.totalDays || 15;
    const eligiblePending = attendeesForSelectedWebinar.filter(a => {
      const { isEligible } = computeAttendeeStats(a, totalDays);
      return isEligible && !a.certificateIssued;
    });

    if (eligiblePending.length === 0) {
      toast('No students are currently eligible with pending certificates.', { icon: 'ℹ️' });
      return;
    }

    setConfirmModalState({
      isOpen: true,
      title: `Issue ${eligiblePending.length} Certificates?`,
      message: `Generate and issue official completion certificates to all ${eligiblePending.length} eligible students (>= 75% attendance) in ${selectedWebinar.title}?`,
      variant: 'primary',
      onConfirm: async () => {
        const toastId = toast.loading(`Issuing ${eligiblePending.length} certificates...`);
        try {
          const batch = writeBatch(db);
          for (const attendee of eligiblePending) {
            const certCode = `FCAI-WEB-${Date.now().toString().slice(-5)}-${Math.floor(1000 + Math.random() * 9000)}`;
            const certRef = doc(collection(db, 'certificates'));
            const { percentage } = computeAttendeeStats(attendee, totalDays);

            batch.set(certRef, {
              certificateId: certCode,
              studentName: attendee.studentName,
              studentEmail: attendee.email.toLowerCase().trim(),
              courseName: selectedWebinar.title,
              domain: selectedWebinar.topic || 'Multi-Day Technical Masterclass',
              type: 'webinar_bootcamp',
              issueDate: new Date().toISOString().split('T')[0],
              grade: percentage >= 90 ? 'A+' : 'A',
              marksPercentage: `${percentage}% Attendance`,
              status: 'issued',
              collegeName: attendee.collegeName || '',
              createdAt: serverTimestamp(),
            });

            batch.update(doc(db, 'webinar_attendees', attendee.id), {
              certificateIssued: true,
              certificateId: certCode,
              certificateIssuedAt: serverTimestamp(),
            });
          }

          await batch.commit();
          toast.success(`Issued ${eligiblePending.length} certificates successfully!`, { id: toastId });
          await logAdminActivity(user?.email, 'BULK_ISSUED', `${eligiblePending.length} Webinar Certs`, selectedWebinar.title);
          fetchData();
        } catch (err) {
          console.error('Error bulk issuing certs:', err);
          toast.error('Failed to issue certificates', { id: toastId });
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Promote Waitlisted Attendee to Confirmed
  const handlePromoteAttendee = async (attendee: WebinarAttendee) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Promote to Confirmed?',
      message: `Promote ${attendee.studentName} from Waitlist to Confirmed seat?`,
      variant: 'primary',
      onConfirm: async () => {
        const toastId = toast.loading('Promoting student...');
        try {
          await updateDoc(doc(db, 'webinar_attendees', attendee.id), {
            status: 'Confirmed',
            promotedAt: serverTimestamp(),
          });
          toast.success(`${attendee.studentName} is now Confirmed!`, { id: toastId });
          await logAdminActivity(user?.email, 'UPDATED', `Promoted waitlist attendee: ${attendee.studentName}`);
          fetchData();
        } catch (err) {
          console.error('Error promoting:', err);
          toast.error('Failed to promote attendee', { id: toastId });
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Delete single attendee
  const handleDeleteAttendee = (attendee: WebinarAttendee) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Delete Student Record?',
      message: `Are you sure you want to remove ${attendee.studentName} from this webinar? All attendance logs for this student will be deleted.`,
      variant: 'danger',
      onConfirm: async () => {
        const toastId = toast.loading('Deleting record...');
        try {
          await deleteDoc(doc(db, 'webinar_attendees', attendee.id));
          toast.success('Attendee deleted successfully', { id: toastId });
          await logAdminActivity(user?.email, 'DELETED', `Attendee: ${attendee.studentName}`, attendee.webinarTitle);
          fetchData();
        } catch (err) {
          console.error('Error deleting:', err);
          toast.error('Failed to delete student', { id: toastId });
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModalState({
      isOpen: true,
      title: `Delete ${selectedIds.length} Students?`,
      message: `Are you sure you want to delete ${selectedIds.length} selected attendee record(s)? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        const toastId = toast.loading(`Deleting ${selectedIds.length} records...`);
        try {
          const batch = writeBatch(db);
          selectedIds.forEach(id => {
            batch.delete(doc(db, 'webinar_attendees', id));
          });
          await batch.commit();
          toast.success(`Deleted ${selectedIds.length} records successfully!`, { id: toastId });
          await logAdminActivity(user?.email, 'BULK_DELETED', `${selectedIds.length} Webinar Attendees`);
          fetchData();
          setSelectedIds([]);
        } catch (err) {
          console.error('Error in bulk delete:', err);
          toast.error('Failed to delete records', { id: toastId });
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Export Attendees & Multi-day attendance to CSV
  const exportAttendeesCSV = () => {
    if (!selectedWebinar) return;
    const list = displayedAttendees;
    if (list.length === 0) {
      toast.error('No attendees available to export.');
      return;
    }

    const data = list.map((a, idx) => {
      const stats = computeAttendeeStats(a, selectedWebinar.totalDays || 15);
      const rowObj: Record<string, any> = {
        '#': idx + 1,
        'Student Name': a.studentName,
        'Email Address': a.email,
        'Phone Number': a.phone || '',
        'College / Institute': a.collegeName || '',
        'Branch / Department': a.branch || '',
        'Year of Study': a.yearOfStudy || '',
        'Registration Status': a.status || 'Confirmed',
        'Attendance %': `${stats.percentage}%`,
        'Days Attended': `${stats.presentDays} / ${selectedWebinar.totalDays || 15}`,
        'Certificate Status': a.certificateIssued ? 'Issued' : (stats.isEligible ? 'Eligible (Pending)' : 'Ineligible'),
        'Certificate ID': a.certificateId || '',
      };

      activeSessionDates.forEach((dateStr, dIdx) => {
        rowObj[`Day ${dIdx + 1} (${formatDateShort(dateStr)})`] = a.dailyAttendance?.[dateStr] || 'Absent';
      });

      return rowObj;
    });

    const safeTitle = selectedWebinar.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    exportCSV(`${safeTitle}_Attendance_${new Date().toISOString().split('T')[0]}.csv`, data);
  };

  // Download sample Google Form CSV template
  const downloadSampleCSV = () => {
    const headers = [
      'Timestamp',
      'Full Name',
      'Email Address',
      'WhatsApp Number',
      'College Name',
      'Department / Branch',
      'Year of Study',
    ];
    const sampleRows = [
      [
        new Date().toISOString(),
        'Rahul Sharma',
        'rahul.sharma@example.com',
        '9876543210',
        'MIT Muzaffarpur',
        'Computer Science',
        '3rd Year',
      ],
      [
        new Date().toISOString(),
        'Priya Kumari',
        'priya.k@example.com',
        '9876543211',
        'NIT Patna',
        'Information Technology',
        '2nd Year',
      ],
    ];
    downloadTemplateCSV('Google_Forms_Webinar_Roster_Template.csv', headers, sampleRows);
  };

  // Trigger CSV upload dialog
  const triggerCsvUploadForWebinar = (webinar?: WebinarItem) => {
    if (webinar) {
      setTargetWebinarId(webinar.id);
      setTargetWebinarTitle(webinar.title);
    } else if (webinars.length > 0) {
      setTargetWebinarId(webinars[0].id);
      setTargetWebinarTitle(webinars[0].title);
    }
    setImportAttendanceForDate(activeDate);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Parse CSV when file chosen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    parseCSV(
      file,
      (rows: any[]) => {
        const mapped = rows.map(r => ({
          studentName: resolveHeaderValue(r, ['full name', 'student name', 'name', 'attendee name', 'name of the student', 'candidate name']),
          email: resolveHeaderValue(r, ['email address', 'email', 'mail', 'student email', 'e-mail']),
          phone: resolveHeaderValue(r, ['whatsapp number', 'phone', 'contact', 'mobile', 'mobile number', 'phone number', 'whatsapp']),
          collegeName: resolveHeaderValue(r, ['college name', 'college', 'institute', 'institution', 'university', 'college / institute name']),
          branch: resolveHeaderValue(r, ['department / branch', 'branch', 'department', 'stream', 'course']),
          yearOfStudy: resolveHeaderValue(r, ['year of study', 'year', 'semester', 'academic year']),
          timestamp: resolveHeaderValue(r, ['timestamp', 'date', 'time', 'submission time']),
        })).filter(item => item.email && item.studentName);

        if (mapped.length === 0) {
          toast.error('No valid rows found. Please check CSV header column names.');
          return;
        }

        setParsedRows(mapped);
        setShowImportModal(true);
      },
      (err) => {
        toast.error(`CSV Parsing error: ${err.message}`);
      }
    );
  };

  // Save imported rows to Firestore
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0 || !targetWebinarId) return;
    setImporting(true);
    const toastId = toast.loading(`Importing ${parsedRows.length} attendees...`);

    try {
      const batch = writeBatch(db);
      const targetW = webinars.find(w => w.id === targetWebinarId);
      const webinarTitle = targetW ? targetW.title : targetWebinarTitle;

      for (const row of parsedRows) {
        const newRef = doc(collection(db, 'webinar_attendees'));
        const initialAttendance = importAttendanceForDate ? { [importAttendanceForDate]: 'Present' } : {};

        batch.set(newRef, {
          webinarId: targetWebinarId,
          webinarTitle,
          studentName: row.studentName,
          email: row.email.toLowerCase().trim(),
          phone: row.phone || '',
          collegeName: row.collegeName || 'N/A',
          branch: row.branch || '',
          yearOfStudy: row.yearOfStudy || '',
          timestamp: row.timestamp || new Date().toISOString(),
          dailyAttendance: initialAttendance,
          certificateIssued: false,
          source: 'google_form_csv',
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      toast.success(`Imported ${parsedRows.length} students to ${webinarTitle}!`, { id: toastId });
      await logAdminActivity(user?.email, 'CREATED', `CSV Imported ${parsedRows.length} Attendees`, webinarTitle);
      
      setShowImportModal(false);
      setParsedRows([]);
      fetchData();
    } catch (err) {
      console.error('Error importing attendees:', err);
      toast.error('Failed to import attendees', { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  // Manual Add Student Submit
  const handleAddManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.studentName || !addFormData.email || !addFormData.webinarId) {
      toast.error('Please fill required fields (Webinar, Name, Email)');
      return;
    }
    setIsAdding(true);

    try {
      const initialAttendance = activeDate ? { [activeDate]: 'Present' } : {};
      await addDoc(collection(db, 'webinar_attendees'), {
        webinarId: addFormData.webinarId,
        webinarTitle: addFormData.webinarTitle,
        studentName: addFormData.studentName,
        email: addFormData.email.toLowerCase().trim(),
        phone: addFormData.phone || '',
        collegeName: addFormData.collegeName || 'N/A',
        branch: addFormData.branch || '',
        yearOfStudy: addFormData.yearOfStudy || '',
        dailyAttendance: initialAttendance,
        certificateIssued: false,
        source: 'manual',
        createdAt: serverTimestamp(),
      });

      toast.success(`Added ${addFormData.studentName} to ${addFormData.webinarTitle}!`);
      await logAdminActivity(user?.email, 'CREATED', `Attendee: ${addFormData.studentName}`, addFormData.webinarTitle);
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      console.error('Error adding attendee:', err);
      toast.error('Failed to add attendee');
    } finally {
      setIsAdding(false);
    }
  };

  // Create / Edit Webinar Submit
  const handleSaveWebinar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webinarFormData.title.trim()) {
      toast.error('Webinar Title is required');
      return;
    }
    setIsSavingWebinar(true);

    try {
      const { endDate } = generateWebinarSchedule(
        webinarFormData.startDate,
        webinarFormData.totalDays,
        editingWebinar?.postponedDates || [],
        editingWebinar?.postponements || {}
      );

      const payload = {
        title: webinarFormData.title.trim(),
        topic: webinarFormData.topic.trim(),
        speaker: webinarFormData.speaker.trim(),
        startDate: webinarFormData.startDate,
        endDate,
        totalDays: Number(webinarFormData.totalDays) || 15,
        maxSeats: Number(webinarFormData.maxSeats) || 100,
        time: webinarFormData.time.trim(),
        meetingLink: webinarFormData.meetingLink.trim(),
        formLink: webinarFormData.formLink.trim(),
        status: webinarFormData.status,
        updatedAt: serverTimestamp(),
      };

      if (editingWebinar) {
        await updateDoc(doc(db, 'webinars', editingWebinar.id), payload);
        toast.success('Webinar updated successfully!');
        await logAdminActivity(user?.email, 'UPDATED', `Webinar: ${payload.title}`);
      } else {
        await addDoc(collection(db, 'webinars'), {
          ...payload,
          postponedDates: [],
          postponements: {},
          createdAt: serverTimestamp(),
        });
        toast.success('New Multi-Day Webinar created!');
        await logAdminActivity(user?.email, 'CREATED', `Webinar: ${payload.title}`);
      }

      setShowWebinarModal(false);
      setEditingWebinar(null);
      fetchData();
    } catch (err) {
      console.error('Error saving webinar:', err);
      toast.error('Failed to save webinar');
    } finally {
      setIsSavingWebinar(false);
    }
  };

  const handleOpenCreateWebinar = () => {
    setEditingWebinar(null);
    setWebinarFormData({
      title: '',
      topic: '',
      speaker: '',
      startDate: new Date().toISOString().split('T')[0],
      totalDays: 15,
      maxSeats: 100,
      time: '05:00 PM - 06:30 PM',
      meetingLink: '',
      formLink: '',
      status: 'Upcoming',
    });
    setShowWebinarModal(true);
  };

  const handleOpenEditWebinar = (webinar: WebinarItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWebinar(webinar);
    setWebinarFormData({
      title: webinar.title,
      topic: webinar.topic || '',
      speaker: webinar.speaker || '',
      startDate: webinar.startDate,
      totalDays: webinar.totalDays || 15,
      maxSeats: webinar.maxSeats || 100,
      time: webinar.time || '05:00 PM - 06:30 PM',
      meetingLink: webinar.meetingLink || '',
      formLink: webinar.formLink || '',
      status: webinar.status,
    });
    setShowWebinarModal(true);
  };

  const handleDeleteWebinar = (webinar: WebinarItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModalState({
      isOpen: true,
      title: 'Delete Webinar?',
      message: `Are you sure you want to delete "${webinar.title}"? This will not delete attendee history unless explicitly cleared.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'webinars', webinar.id));
          toast.success('Webinar deleted');
          await logAdminActivity(user?.email, 'DELETED', `Webinar: ${webinar.title}`);
          if (selectedWebinar?.id === webinar.id) setSelectedWebinar(null);
          fetchData();
        } catch (err) {
          console.error('Error deleting webinar:', err);
          toast.error('Failed to delete webinar');
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleOpenAddStudent = (webinar?: WebinarItem) => {
    const target = webinar || selectedWebinar || (webinars.length > 0 ? webinars[0] : null);
    setAddFormData({
      studentName: '',
      email: '',
      phone: '',
      collegeName: '',
      branch: '',
      yearOfStudy: '',
      webinarId: target ? target.id : '',
      webinarTitle: target ? target.title : '',
    });
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <Toaster position="top-center" />

      {/* Hidden file input for CSV */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
      />

      {/* Top Header */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {selectedWebinar ? (
              <button
                onClick={() => { setSelectedWebinar(null); setSearchTerm(''); }}
                className="p-2.5 rounded-2xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors border border-purple-200 active:scale-95 cursor-pointer"
                title="Back to all webinars catalog"
              >
                <ArrowLeft size={20} />
              </button>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                <Video size={24} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {selectedWebinar ? selectedWebinar.title : 'Webinar Management'}
                </h1>
                {selectedWebinar && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                    {selectedWebinar.totalDays}-Day Bootcamp
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                {selectedWebinar 
                  ? `Active Schedule: ${formatDateFull(selectedWebinar.startDate)} → ${formatDateFull(selectedWebinar.endDate || selectedWebinar.startDate)}`
                  : 'Track daily attendance, manage Google Form CSV imports, and issue verified course certificates.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-2 lg:pt-0">
            <button
              onClick={() => setShowFormatGuide(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs active:scale-95"
              title="View CSV Header Format"
            >
              <HelpCircle size={15} className="text-purple-600 shrink-0" />
              <span>CSV Format</span>
            </button>

            {selectedWebinar ? (
              <>
                <button
                  onClick={handleBulkIssueEligibleCertificates}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
                  title="Issue Certificates to all students with >= 75% attendance"
                >
                  <Award size={15} className="shrink-0" />
                  <span className="truncate">Issue &ge;75% Certs ({selectedWebinarStats?.eligibleCount || 0})</span>
                </button>

                <button
                  onClick={() => triggerCsvUploadForWebinar(selectedWebinar)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-purple-600/20 cursor-pointer active:scale-95"
                >
                  <Upload size={15} className="shrink-0" />
                  <span>Import CSV</span>
                </button>

                <button
                  onClick={() => handleOpenAddStudent(selectedWebinar)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
                >
                  <Plus size={15} className="shrink-0" />
                  <span>Add Student</span>
                </button>

                <button
                  onClick={exportAttendeesCSV}
                  className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
                  title="Export all multi-day attendance records to CSV"
                >
                  <Download size={15} className="shrink-0" />
                  <span>Export Attendance</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleOpenCreateWebinar}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-purple-600/20 cursor-pointer active:scale-95"
                >
                  <Plus size={15} className="shrink-0" />
                  <span>Create Webinar</span>
                </button>

                <button
                  onClick={() => triggerCsvUploadForWebinar()}
                  className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
                >
                  <Upload size={15} className="shrink-0" />
                  <span>Import CSV</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Overview Grid */}
      {selectedWebinar ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Enrolled</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{selectedWebinarStats?.total || 0}</p>
            <p className="text-[11px] font-medium text-slate-500">Students registered</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Present Today</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600">{selectedWebinarStats?.presentOnActiveDate || 0}</p>
            <p className="text-[11px] font-medium text-slate-500 truncate">On {formatDateShort(activeDate)}</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Eligible (&ge;75%)</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-indigo-600">{selectedWebinarStats?.eligibleCount || 0}</p>
            <p className="text-[11px] font-bold text-indigo-700">&ge; 75% ({selectedWebinarStats?.eligibleRate || 0}% of cohort)</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Certificates</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-600">{selectedWebinarStats?.certCount || 0}</p>
            <p className="text-[11px] font-medium text-slate-500">Issued credentials</p>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Colleges</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <School size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{selectedWebinarStats?.colleges.size || 0}</p>
            <p className="text-[11px] font-medium text-slate-500">Institutions reached</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Webinars</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Video size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{globalStats.totalWebinars}</p>
            <p className="text-[11px] font-medium text-slate-500">Active sessions</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Students</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-indigo-600">{globalStats.totalStudents}</p>
            <p className="text-[11px] font-medium text-slate-500">Enrolled cohort</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Eligible (&ge;75%)</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600">{globalStats.totalEligible}</p>
            <p className="text-[11px] font-bold text-emerald-700">Eligible for certs</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Certificates</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-600">{globalStats.totalCerts}</p>
            <p className="text-[11px] font-medium text-slate-500">Issued credentials</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!selectedWebinar ? (
        <WebinarCatalog
          webinars={filteredWebinars}
          loading={loading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={webinarStatusFilter}
          setStatusFilter={setWebinarStatusFilter}
          webinarMetrics={webinarMetrics}
          onSelectWebinar={(w) => {
            setSelectedWebinar(w);
            setSearchTerm('');
          }}
          onCreateWebinar={handleOpenCreateWebinar}
          onEditWebinar={handleOpenEditWebinar}
          onDeleteWebinar={handleDeleteWebinar}
          onImportCsvForWebinar={triggerCsvUploadForWebinar}
          onRefresh={fetchData}
        />
      ) : (
        <div className="space-y-4">
          <WebinarAttendanceFilters
            selectedWebinar={selectedWebinar}
            activeDate={activeDate}
            setActiveDate={setActiveDate}
            activeScheduleList={activeScheduleList}
            activeSessionDates={activeSessionDates}
            attendeesForSelectedWebinar={attendeesForSelectedWebinar}
            dayRibbonRef={dayRibbonRef}
            scrollDayRibbon={scrollDayRibbon}
            handleNavigateDay={handleNavigateDay}
            handleTogglePostponeDay={handleTogglePostponeDay}
            handleMarkAllPresentOnActiveDate={handleMarkAllPresentOnActiveDate}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            attendanceEligibilityFilter={attendanceEligibilityFilter}
            setAttendanceEligibilityFilter={setAttendanceEligibilityFilter}
            selectedCollege={selectedCollege}
            setSelectedCollege={setSelectedCollege}
            uniqueColleges={uniqueColleges}
            selectedIds={selectedIds}
            onBulkMarkAttended={handleBulkMarkAttendedActiveDate}
            onBulkDelete={handleBulkDelete}
            onRefresh={fetchData}
          />

          <WebinarAttendanceTable
            displayedAttendees={displayedAttendees}
            selectedWebinar={selectedWebinar}
            activeDate={activeDate}
            selectedIds={selectedIds}
            onToggleSelectId={(id) => {
              setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
            }}
            onSelectAll={() => {
              if (selectedIds.length === displayedAttendees.length) {
                setSelectedIds([]);
              } else {
                setSelectedIds(displayedAttendees.map(a => a.id));
              }
            }}
            onToggleDailyAttendance={handleToggleDailyAttendance}
            onOpenDetailStudent={setDetailStudent}
            onIssueCertificate={handleIssueCertificate}
            onDeleteAttendee={handleDeleteAttendee}
            onPromoteAttendee={handlePromoteAttendee}
            onImportCsv={() => triggerCsvUploadForWebinar(selectedWebinar)}
            computeStats={computeAttendeeStats}
          />
        </div>
      )}

      {/* Student 15-Day Attendance History Modal */}
      <AttendeeDetailModal
        attendee={detailStudent}
        selectedWebinar={selectedWebinar}
        activeSessionDates={activeSessionDates}
        onClose={() => setDetailStudent(null)}
        onToggleAttendance={handleToggleDailyAttendance}
        onIssueCertificate={handleIssueCertificate}
        computeStats={computeAttendeeStats}
      />

      {/* Create / Edit Webinar Modal */}
      <CreateEditWebinarModal
        isOpen={showWebinarModal}
        onClose={() => setShowWebinarModal(false)}
        editingWebinar={editingWebinar}
        formData={webinarFormData}
        setFormData={setWebinarFormData}
        onSubmit={handleSaveWebinar}
        isSaving={isSavingWebinar}
      />

      {/* CSV Specification / Guide Modal */}
      <WebinarCsvGuideModal
        isOpen={showFormatGuide}
        onClose={() => setShowFormatGuide(false)}
        onDownloadSample={downloadSampleCSV}
      />

      {/* CSV Import Modal */}
      <WebinarCsvImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        csvFileName={csvFileName}
        parsedRows={parsedRows}
        webinars={webinars}
        targetWebinarId={targetWebinarId}
        setTargetWebinarId={setTargetWebinarId}
        targetWebinarTitle={targetWebinarTitle}
        setTargetWebinarTitle={setTargetWebinarTitle}
        importAttendanceForDate={importAttendanceForDate}
        setImportAttendanceForDate={setImportAttendanceForDate}
        onConfirmImport={handleConfirmImport}
        importing={importing}
      />

      {/* Manual Add Student Modal */}
      <AddAttendeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        webinars={webinars}
        formData={addFormData}
        setFormData={setAddFormData}
        onSubmit={handleAddManualSubmit}
        isAdding={isAdding}
      />

      {/* Postpone Modal */}
      <PostponeDayModal
        isOpen={showPostponeModal}
        onClose={() => setShowPostponeModal(false)}
        dateTarget={postponeDateTarget}
        reason={postponeReason}
        setReason={setPostponeReason}
        onConfirm={handleConfirmPostpone}
        isSubmitting={isPostponing}
      />

      {/* Generic Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        variant={confirmModalState.variant}
      />
    </div>
  );
}
