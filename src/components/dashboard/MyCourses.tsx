import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, ArrowRight, Award, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import CertificateModal from '../certificate/CertificateModal';
import type { CertificateData } from '../certificate/CourseCertificate';

interface Enrollment {
  id: string;
  studentId?: string;
  studentEmail?: string;
  studentName?: string;
  courseName: string;
  institute: string;
  city: string;
  batchTiming: string;
  batch?: string;
  status: 'Ongoing' | 'Completed' | string;
  image: string;
}

function matchesUser(user: any, targetEmail?: string, targetName?: string, targetId?: string): boolean {
  if (!user) return false;
  const uEmail = (user.email || '').toLowerCase().trim();
  const uName = (user.displayName || '').toLowerCase().trim();
  const uUid = user.uid || '';

  const tEmail = (targetEmail || '').toLowerCase().trim();
  const tName = (targetName || '').toLowerCase().trim();
  const tId = targetId || '';

  // 1. Direct UID match
  if (tId && uUid && tId === uUid) return true;

  // 2. Exact email match (case-insensitive)
  if (tEmail && uEmail && tEmail === uEmail) return true;

  // 3. Name match (exact or sub-name, e.g. "Ravi" vs "Ravi Ranjan Kumar")
  if (tName && uName) {
    if (tName === uName) return true;
    if (tName.includes(uName) || uName.includes(tName)) return true;
  }

  return false;
}

export default function MyCourses() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCert, setPreviewCert] = useState<CertificateData | null>(null);
  const [showCertPreview, setShowCertPreview] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const [enrollSnap, certSnap, coursesSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, 'enrollments')),
          getDocs(collection(db, 'certificates')),
          getDocs(collection(db, 'courses')),
          getDocs(collection(db, 'users')),
        ]);

        const catalogCourses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        const allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        const allEnrollments = enrollSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        const allCerts = certSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

        // 1. Find matching certificates
        const matchedCerts = allCerts.filter(c => {
          if (c.revoked) return false;
          return matchesUser(user, c.studentEmail, c.studentName, c.studentId);
        });
        setCertificates(matchedCerts);

        // 2. Find matching user profile document(s)
        const matchedUserDocs = allUsers.filter(u => matchesUser(user, u.email, u.displayName, u.id || u.uid));

        // 3. Find matching enrollments
        const matchedEnrollments: Enrollment[] = [];
        const enrolledCourseNames = new Set<string>();

        // From enrollments collection
        for (const e of allEnrollments) {
          if (matchesUser(user, e.studentEmail, e.studentName, e.studentId)) {
            const cName = (e.courseName || 'Course').trim();
            const key = cName.toLowerCase();
            if (!enrolledCourseNames.has(key)) {
              enrolledCourseNames.add(key);
              matchedEnrollments.push({
                id: e.id,
                studentId: e.studentId,
                studentEmail: e.studentEmail,
                studentName: e.studentName,
                courseName: cName,
                institute: e.institute || 'FutureCode AI (Online)',
                city: e.city || 'Online',
                batchTiming: e.batchTiming || e.batch || 'Regular Batch',
                batch: e.batch,
                status: e.status || 'Ongoing',
                image: e.image || '',
              });
            }
          }
        }

        // From matching user profiles (if enrolledCourse field is set)
        for (const uDoc of matchedUserDocs) {
          if (uDoc.enrolledCourse) {
            const cName = uDoc.enrolledCourse.trim();
            const key = cName.toLowerCase();
            if (!enrolledCourseNames.has(key)) {
              enrolledCourseNames.add(key);
              matchedEnrollments.push({
                id: `user-prof-${uDoc.id}`,
                studentId: user.uid,
                studentEmail: user.email,
                studentName: uDoc.displayName || user.displayName,
                courseName: cName,
                institute: uDoc.assignedCenter || 'FutureCode AI (Online)',
                city: 'Online',
                batchTiming: uDoc.batch || 'Regular Cohort',
                batch: uDoc.batch,
                status: 'Ongoing',
                image: '',
              });
            }
          }
        }

        // From certificates (if a certificate exists for a course, ensure it's displayed)
        for (const cert of matchedCerts) {
          const cName = (cert.domain || cert.courseName || 'Certified Course').trim();
          const key = cName.toLowerCase();
          if (!enrolledCourseNames.has(key)) {
            enrolledCourseNames.add(key);
            matchedEnrollments.push({
              id: `cert-course-${cert.id}`,
              studentId: user.uid,
              studentEmail: user.email,
              studentName: cert.studentName || user.displayName,
              courseName: cName,
              institute: 'FutureCode AI (Online)',
              city: 'Online',
              batchTiming: cert.endDate || cert.issueDate ? `Completed on ${cert.endDate || cert.issueDate}` : 'Completed',
              status: 'Completed',
              image: '',
            });
          }
        }

        // Enrich each enrollment with catalog thumbnail if missing
        const formatted = matchedEnrollments.map(e => {
          let img = e.image;
          if (!img || img === '') {
            const matched = catalogCourses.find(c =>
              c.title?.toLowerCase() === e.courseName?.toLowerCase() ||
              c.courseName?.toLowerCase() === e.courseName?.toLowerCase()
            );
            img = matched?.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800';
          }
          return {
            ...e,
            image: img,
          };
        });

        setEnrollments(formatted);
      } catch (error) {
        console.error("Error fetching student courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user]);

  const handleOpenCertificate = (cert: any) => {
    const effectiveDate = cert.endDate || cert.issueDate;
    setPreviewCert({
      id: cert.id,
      certificateId: cert.certificateId || cert.id,
      studentName: cert.studentName || user?.displayName || 'Student',
      studentEmail: cert.studentEmail || user?.email || '',
      gender: cert.gender || 'Male',
      courseName: cert.courseName || 'Course Certificate',
      domain: cert.domain || cert.courseName,
      startDate: cert.startDate,
      endDate: effectiveDate,
      issueDate: effectiveDate,
      grade: cert.grade,
      marksPercentage: cert.marksPercentage,
    });
    setShowCertPreview(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-indigo-600 border-t-transparent" />
        <span className="text-sm font-semibold text-slate-500">Loading your courses...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if certificates exist */}
      {certificates.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
              <Award size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                Verified Certificate Available! 🎓
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                  {certificates.length} {certificates.length === 1 ? 'Certificate' : 'Certificates'}
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                Your official certificate has been issued and is ready for download &amp; verification.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/student/certificates"
            className="px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 shrink-0 transition-all active:scale-95 cursor-pointer"
          >
            <Award size={16} /> View Certificates
          </Link>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-text-heading">My Courses</h2>
          {enrollments.length > 0 && (
            <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              {enrollments.length} {enrollments.length === 1 ? 'Enrolled Course' : 'Enrolled Courses'}
            </span>
          )}
        </div>

        {enrollments.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 md:p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
              <BookOpen size={36} />
            </div>
            <h2 className="text-2xl font-extrabold text-text-heading mb-2">No Courses Enrolled Yet</h2>
            <p className="text-slate-500 font-medium max-w-md mx-auto mb-8 text-sm leading-relaxed">
              If your administrator or center recently registered you, your enrolled courses will appear here automatically.
            </p>
            <Link 
              to="/programs" 
              className="bg-primary text-white px-8 py-3.5 rounded-xl font-bold shadow-glow-primary hover:bg-indigo-600 transition-colors flex items-center gap-2 text-sm"
            >
              Browse Programs
              <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map((course, idx) => {
              // Check if a certificate matches this course
              const matchedCert = certificates.find(c =>
                c.courseName?.toLowerCase().trim() === course.courseName?.toLowerCase().trim() ||
                c.domain?.toLowerCase().trim() === course.courseName?.toLowerCase().trim()
              ) || (certificates.length === 1 ? certificates[0] : null);

              return (
                <motion.div 
                  key={course.id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col hover:shadow-xl transition-shadow duration-300 group"
                >
                  <div className="h-44 relative bg-slate-900 overflow-hidden">
                    <img
                      src={course.image}
                      alt={course.courseName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        course.status === 'Completed' || matchedCert
                          ? 'bg-emerald-500 text-white shadow-sm' 
                          : 'bg-primary text-white shadow-glow-primary'
                      }`}>
                        {matchedCert ? 'Certified' : course.status}
                      </span>

                      {matchedCert && (
                        <span className="px-2 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-slate-950 shadow-sm">
                          {matchedCert.certificateId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-text-heading mb-3 leading-tight line-clamp-2">
                        {course.courseName}
                      </h3>
                      
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          <Building2 size={15} className="text-slate-400 shrink-0" />
                          <span className="truncate">{course.institute} {course.city ? `• ${course.city}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          <Clock size={15} className="text-slate-400 shrink-0" />
                          <span>{course.batchTiming || course.batch || 'Regular Batch'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Certificate CTA on the Course Card */}
                    {matchedCert ? (
                      <button
                        onClick={() => handleOpenCertificate(matchedCert)}
                        className="w-full py-2.5 rounded-xl font-extrabold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <Award size={16} /> View &amp; Download Certificate
                      </button>
                    ) : (
                      <div className="text-xs text-slate-500 text-center py-2.5 bg-slate-50 rounded-xl font-semibold border border-slate-100 flex items-center justify-center gap-1.5">
                        <Clock size={13} className="text-indigo-500" /> Course in progress
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Certificate Preview Modal */}
      <CertificateModal
        isOpen={showCertPreview}
        onClose={() => {
          setShowCertPreview(false);
          setPreviewCert(null);
        }}
        certificate={previewCert}
      />
    </div>
  );
}
