import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Video, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  Award, 
  TrendingUp, 
  ExternalLink, 
  Sparkles, 
  Check, 
  X, 
  AlertCircle,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import CertificateModal from '../certificate/CertificateModal';
import type { CertificateData } from '../certificate/CourseCertificate';

export interface WebinarItem {
  id: string;
  title: string;
  topic?: string;
  speaker?: string;
  startDate: string;
  endDate?: string;
  totalDays: number;
  time?: string;
  meetingLink?: string;
  formLink?: string;
  status: 'Upcoming' | 'Live' | 'Completed';
  createdAt?: any;
}

export interface WebinarAttendee {
  id: string;
  webinarId?: string;
  webinarTitle: string;
  studentName: string;
  email: string;
  phone?: string;
  collegeName?: string;
  branch?: string;
  yearOfStudy?: string;
  dailyAttendance: Record<string, 'Present' | 'Absent'>;
  certificateIssued: boolean;
  certificateId?: string;
  certificateIssuedAt?: any;
}

// Generate session dates array (Day 1, Day 2, ..., Day N)
function generateSessionDates(startDateStr: string, totalDays: number): string[] {
  const dates: string[] = [];
  if (!startDateStr || totalDays <= 0) return dates;
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return dates;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatDateFull(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyWebinars() {
  const { user } = useAuth();
  const [webinars, setWebinars] = useState<WebinarItem[]>([]);
  const [attendeeRecords, setAttendeeRecords] = useState<WebinarAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'enrolled' | 'all'>('enrolled');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  // Certificate Modal Preview
  const [previewCert, setPreviewCert] = useState<CertificateData | null>(null);
  const [showCertPreview, setShowCertPreview] = useState(false);

  // Selected webinar for detailed day-by-day attendance modal
  const [selectedWebinarForDetails, setSelectedWebinarForDetails] = useState<{
    webinar: WebinarItem;
    attendee: WebinarAttendee;
  } | null>(null);

  // Fetch webinars & student's attendance records
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Fetch All Webinars
      const webinarsSnap = await getDocs(query(collection(db, 'webinars'), orderBy('createdAt', 'desc')));
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
          time: data.time || '',
          meetingLink: data.meetingLink || '',
          formLink: data.formLink || '',
          status: data.status || 'Upcoming',
          createdAt: data.createdAt,
        } as WebinarItem;
      });
      setWebinars(webinarsList);

      // 2. Fetch Attendee records matching student email/uid/name
      const attendeesSnap = await getDocs(collection(db, 'webinar_attendees'));
      const uEmail = (user.email || '').toLowerCase().trim();
      const uName = (user.displayName || '').toLowerCase().trim();
      const uUid = user.uid || '';

      const myRecords = attendeesSnap.docs
        .map(d => ({ id: d.id, ...d.data() }) as WebinarAttendee)
        .filter(a => {
          const aEmail = (a.email || '').toLowerCase().trim();
          const aName = (a.studentName || '').toLowerCase().trim();
          const aId = (a as any).studentId || '';

          if (aEmail && uEmail && aEmail === uEmail) return true;
          if (aId && uUid && aId === uUid) return true;
          if (aName && uName && (aName === uName || aName.includes(uName) || uName.includes(aName))) return true;
          return false;
        });

      setAttendeeRecords(myRecords);
    } catch (err) {
      console.error('Error loading student webinars:', err);
      toast.error('Could not load webinars. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute student stats for a specific webinar
  const getStudentWebinarData = useCallback((webinar: WebinarItem) => {
    const attendee = attendeeRecords.find(a => {
      if (a.webinarId && a.webinarId === webinar.id) return true;
      if (a.webinarTitle && a.webinarTitle.toLowerCase() === webinar.title.toLowerCase()) return true;
      return false;
    });

    const isEnrolled = !!attendee;
    const totalDays = webinar.totalDays || 15;
    const daily = attendee?.dailyAttendance || {};
    const presentDays = Object.values(daily).filter(v => v === 'Present').length;
    const percentage = Math.round((presentDays / (totalDays > 0 ? totalDays : 1)) * 100);
    const isEligible = percentage >= 75;
    const daysNeededFor75 = Math.max(0, Math.ceil(0.75 * totalDays) - presentDays);

    return {
      attendee,
      isEnrolled,
      totalDays,
      presentDays,
      percentage,
      isEligible,
      daysNeededFor75,
      certificateIssued: attendee?.certificateIssued || false,
      certificateId: attendee?.certificateId,
    };
  }, [attendeeRecords]);

  // Self Enroll Handler
  const handleSelfEnroll = async (webinar: WebinarItem) => {
    if (!user) return;
    setEnrollingId(webinar.id);
    const toastId = toast.loading(`Registering for ${webinar.title}...`);

    try {
      const newAttendee: WebinarAttendee = {
        id: '',
        webinarId: webinar.id,
        webinarTitle: webinar.title,
        studentName: user.displayName || user.email?.split('@')[0] || 'Student',
        email: (user.email || '').toLowerCase().trim(),
        phone: user.phone || '',
        collegeName: user.school || 'N/A',
        branch: user.degree || 'N/A',
        yearOfStudy: user.yearOfStudy || 'N/A',
        dailyAttendance: {},
        certificateIssued: false,
      };

      const docRef = await addDoc(collection(db, 'webinar_attendees'), {
        ...newAttendee,
        source: 'student_self_enroll',
        createdAt: serverTimestamp(),
      });

      newAttendee.id = docRef.id;
      setAttendeeRecords(prev => [newAttendee, ...prev]);
      toast.success(`Successfully enrolled in ${webinar.title}!`, { id: toastId });
      setActiveTab('enrolled');
    } catch (err) {
      console.error('Error self-enrolling:', err);
      toast.error('Failed to register. Please try again or contact support.', { id: toastId });
    } finally {
      setEnrollingId(null);
    }
  };

  // View Issued Certificate
  const handleViewCertificate = (webinar: WebinarItem, attendee: WebinarAttendee) => {
    if (!attendee.certificateId) return;

    const certData: CertificateData = {
      certificateId: attendee.certificateId,
      studentName: attendee.studentName || user?.displayName || 'Student',
      studentEmail: attendee.email || user?.email || '',
      courseName: `${webinar.title} (${webinar.totalDays}-Day Bootcamp)`,
      domain: 'Webinar & Bootcamp Track',
      issueDate: new Date().toISOString().split('T')[0],
      grade: 'A+ (Distinction)',
      marksPercentage: 'Webinar Completion',
    };

    setPreviewCert(certData);
    setShowCertPreview(true);
  };

  // Filtered lists
  const enrolledWebinars = useMemo(() => {
    return webinars.filter(w => {
      const { isEnrolled } = getStudentWebinarData(w);
      return isEnrolled;
    });
  }, [webinars, getStudentWebinarData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-gray-100 p-8 shadow-xs">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500">Loading your webinars &amp; attendance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-purple-200 border border-white/15">
            <Video size={14} className="text-purple-400" />
            <span>Interactive Live Masterclasses &amp; Bootcamps</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Webinars &amp; Attendance Portal
          </h1>
          <p className="text-xs sm:text-sm text-purple-100/80 font-medium max-w-2xl">
            Track your daily attendance live for multi-day bootcamps (e.g. 15 days). Maintain &ge; 75% attendance to receive verified course completion credentials.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 max-w-lg">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-purple-300 block">Enrolled Bootcamps</span>
              <p className="text-xl sm:text-2xl font-black text-white">{enrolledWebinars.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-purple-300 block">Certificates Earned</span>
              <p className="text-xl sm:text-2xl font-black text-amber-400">
                {attendeeRecords.filter(a => a.certificateIssued).length}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-purple-300 block">Required Attendance</span>
              <p className="text-xl sm:text-2xl font-black text-emerald-400">&ge; 75%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('enrolled')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === 'enrolled'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-gray-200/80'
            }`}
          >
            <CheckCircle2 size={16} />
            <span>My Enrolled Webinars</span>
            <span className={`px-2 py-0.2 rounded-full text-[10px] ${
              activeTab === 'enrolled' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {enrolledWebinars.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-gray-200/80'
            }`}
          >
            <Video size={16} />
            <span>All Active Webinars</span>
            <span className={`px-2 py-0.2 rounded-full text-[10px] ${
              activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {webinars.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Webinars List */}
      <div className="space-y-4">
        {activeTab === 'enrolled' ? (
          enrolledWebinars.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-gray-100 shadow-xs flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
                <Video size={28} />
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-1">
                You Haven't Enrolled in Any Webinars Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto mb-6">
                Browse our active 15-day masterclasses and bootcamps, register with 1 click, and start tracking your attendance.
              </p>
              <button
                onClick={() => setActiveTab('all')}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-purple-600/20 cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <PlusCircle size={16} />
                <span>Explore Available Webinars</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {enrolledWebinars.map((webinar, idx) => {
                const {
                  attendee,
                  totalDays,
                  presentDays,
                  percentage,
                  isEligible,
                  daysNeededFor75,
                  certificateIssued,
                  certificateId
                } = getStudentWebinarData(webinar);

                const sessionDates = generateSessionDates(webinar.startDate, totalDays);

                return (
                  <motion.div
                    key={webinar.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs hover:border-purple-300 transition-all space-y-5"
                  >
                    {/* Top Row: Title, Badges, Join Button */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                            {totalDays}-Day Bootcamp
                          </span>
                          <span className={`px-3 py-0.5 rounded-full text-xs font-extrabold border ${
                            webinar.status === 'Live' ? 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse' :
                            webinar.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                            'bg-indigo-100 text-indigo-700 border-indigo-200'
                          }`}>
                            {webinar.status === 'Live' ? '● Live Now' : webinar.status}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <Check size={12} />
                            <span>Enrolled</span>
                          </span>
                        </div>

                        <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                          {webinar.title}
                        </h3>

                        {webinar.topic && (
                          <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            {webinar.topic}
                          </p>
                        )}

                        <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-xs text-slate-500 font-medium pt-1">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-purple-600" />
                            <span>{formatDateFull(webinar.startDate)} &rarr; {formatDateFull(webinar.endDate || webinar.startDate)}</span>
                          </span>

                          {webinar.time && (
                            <span className="flex items-center gap-1.5">
                              <Clock size={13} className="text-slate-400" />
                              <span>{webinar.time}</span>
                            </span>
                          )}

                          {webinar.speaker && (
                            <span className="flex items-center gap-1.5">
                              <User size={13} className="text-indigo-600" />
                              <span>Host: <strong className="text-slate-700">{webinar.speaker}</strong></span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Join Meeting CTA if available */}
                      {webinar.meetingLink && (
                        <div className="shrink-0">
                          <a
                            href={webinar.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                          >
                            <ExternalLink size={16} />
                            <span>Join Live Session</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* ATTENDANCE TRACKER CARD */}
                    <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                            <TrendingUp size={16} className="text-purple-600" />
                            <span>Your Live Attendance Track ({presentDays} / {totalDays} Days)</span>
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Real-time attendance record maintained by admin and session coordinators.
                          </p>
                        </div>

                        {/* Certificate Status Badge / Action */}
                        <div>
                          {certificateIssued ? (
                            <button
                              onClick={() => attendee && handleViewCertificate(webinar, attendee)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 transition-all cursor-pointer active:scale-95"
                            >
                              <Award size={14} />
                              <span>View Certificate ({certificateId})</span>
                            </button>
                          ) : isEligible ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Sparkles size={13} className="text-emerald-700" />
                              <span>Eligible for Certificate (&ge; 75%)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle size={13} />
                              <span>Need {daysNeededFor75} more days for Certificate</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">Attendance Percentage</span>
                          <span className={`font-black text-sm ${isEligible ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, percentage)}%` }}
                            transition={{ duration: 0.6 }}
                            className={`h-full rounded-full ${
                              percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* 15 Days Attendance Grid breakdown */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-700">
                            Day-by-Day Attendance Record:
                          </span>
                          <button
                            onClick={() => attendee && setSelectedWebinarForDetails({ webinar, attendee })}
                            className="text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer"
                          >
                            View Full Timeline &rarr;
                          </button>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
                          {sessionDates.map((dateStr, dIdx) => {
                            const status = attendee?.dailyAttendance?.[dateStr];
                            const isPresent = status === 'Present';

                            return (
                              <div
                                key={dateStr}
                                className={`p-2 rounded-xl border text-center transition-all ${
                                  isPresent
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-600'
                                }`}
                              >
                                <span className="text-[10px] font-black uppercase text-slate-400 block">
                                  Day {dIdx + 1}
                                </span>
                                <span className="text-[11px] font-extrabold block truncate">
                                  {formatDateShort(dateStr)}
                                </span>
                                <span className={`inline-flex items-center justify-center gap-0.5 text-[10px] font-bold mt-1 px-1.5 py-0.2 rounded-md ${
                                  isPresent ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {isPresent ? <Check size={10} /> : <X size={10} />}
                                  <span>{isPresent ? 'P' : 'A'}</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          /* ALL WEBINARS (ENROLLED + OPEN SESSIONS) */
          webinars.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-gray-100 shadow-xs">
              <p className="text-slate-500 text-sm font-medium">No webinars currently scheduled. Please check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {webinars.map((webinar, idx) => {
                const { isEnrolled, totalDays, percentage } = getStudentWebinarData(webinar);

                return (
                  <motion.div
                    key={webinar.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-purple-300 transition-all space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                            {totalDays}-Day Bootcamp
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                            webinar.status === 'Live' ? 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse' :
                            webinar.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                            'bg-indigo-100 text-indigo-700 border-indigo-200'
                          }`}>
                            {webinar.status === 'Live' ? '● Live Now' : webinar.status}
                          </span>
                        </div>

                        {isEnrolled && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <Check size={12} />
                            <span>Enrolled</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                          {webinar.title}
                        </h3>
                        {webinar.topic && (
                          <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">
                            {webinar.topic}
                          </p>
                        )}
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="text-purple-600 shrink-0" />
                          <span className="font-bold text-slate-800">{formatDateFull(webinar.startDate)} &rarr; {formatDateFull(webinar.endDate || webinar.startDate)}</span>
                        </div>
                        {webinar.speaker && (
                          <div className="flex items-center gap-2">
                            <User size={13} className="text-indigo-600 shrink-0" />
                            <span>Host: <strong className="text-slate-800">{webinar.speaker}</strong></span>
                          </div>
                        )}
                        {webinar.time && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Clock size={13} className="text-slate-400 shrink-0" />
                            <span>{webinar.time}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      {isEnrolled ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 size={15} />
                            <span>Enrolled ({percentage}% Attendance)</span>
                          </span>
                          <button
                            onClick={() => setActiveTab('enrolled')}
                            className="px-4 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Track Attendance
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSelfEnroll(webinar)}
                            disabled={enrollingId === webinar.id}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            {enrollingId === webinar.id ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Enrolling...</span>
                              </>
                            ) : (
                              <>
                                <PlusCircle size={15} />
                                <span>1-Click Enroll in Bootcamp</span>
                              </>
                            )}
                          </button>
                          {webinar.formLink && (
                            <a
                              href={webinar.formLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                              title="Open Google Form"
                            >
                              <ExternalLink size={15} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* DETAILED 15-DAY ATTENDANCE MODAL */}
      {selectedWebinarForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[92dvh] flex flex-col border border-gray-100 my-auto animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                    {selectedWebinarForDetails.webinar.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    15-Day Attendance Timeline for {user?.displayName || user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWebinarForDetails(null)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-none space-y-3.5 text-xs sm:text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {generateSessionDates(
                  selectedWebinarForDetails.webinar.startDate,
                  selectedWebinarForDetails.webinar.totalDays || 15
                ).map((dateStr, idx) => {
                  const isPresent = selectedWebinarForDetails.attendee.dailyAttendance?.[dateStr] === 'Present';

                  return (
                    <div
                      key={dateStr}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between ${
                        isPresent
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] uppercase font-black text-slate-400 block">
                          Day {idx + 1}
                        </span>
                        <span className="font-extrabold text-xs block">{formatDateShort(dateStr)}</span>
                      </div>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isPresent ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                      }`}>
                        {isPresent ? <Check size={13} /> : <X size={13} />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
              <button
                onClick={() => setSelectedWebinarForDetails(null)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Preview Modal */}
      {showCertPreview && previewCert && (
        <CertificateModal
          isOpen={showCertPreview}
          onClose={() => { setShowCertPreview(false); setPreviewCert(null); }}
          certificate={previewCert}
        />
      )}
    </div>
  );
}
