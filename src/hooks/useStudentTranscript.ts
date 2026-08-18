import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { matchesUser } from '../utils/matchesUser';
import type { 
  StudentTranscriptData, 
  TranscriptCourseItem, 
  TranscriptWebinarItem 
} from '../components/dashboard/StudentTranscript';
import toast from 'react-hot-toast';

export function useStudentTranscript() {
  const { user } = useAuth();
  const [transcriptData, setTranscriptData] = useState<StudentTranscriptData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTranscript = useCallback(async () => {
    if (!user) {
      toast.error('Please log in to generate your transcript');
      return null;
    }

    setLoading(true);
    const toastId = toast.loading('Compiling your official transcript record…');

    try {
      const userEmailClean = (user.email || '').toLowerCase().trim();

      const [certSnap, certUidSnap, enrollSnap, enrollUidSnap, attendeeSnap] = await Promise.all([
        getDocs(query(collection(db, 'certificates'), where('studentEmail', '==', userEmailClean))),
        user.uid ? getDocs(query(collection(db, 'certificates'), where('studentId', '==', user.uid))) : Promise.resolve(null),
        getDocs(query(collection(db, 'enrollments'), where('studentEmail', '==', userEmailClean))),
        user.uid ? getDocs(query(collection(db, 'enrollments'), where('studentId', '==', user.uid))) : Promise.resolve(null),
        getDocs(query(collection(db, 'webinar_attendees'), where('email', '==', userEmailClean))),
      ]);

      // 1. Compile Certificates & Courses
      const certMap = new Map<string, any>();
      certSnap.docs.forEach(d => certMap.set(d.id, { id: d.id, ...d.data() }));
      if (certUidSnap) {
        certUidSnap.docs.forEach(d => certMap.set(d.id, { id: d.id, ...d.data() }));
      }

      const allCerts = Array.from(certMap.values()).filter(c => !c.revoked && matchesUser(user, c.studentEmail, c.studentName, c.studentId));

      const enrollMap = new Map<string, any>();
      enrollSnap.docs.forEach(d => enrollMap.set(d.id, { id: d.id, ...d.data() }));
      if (enrollUidSnap) {
        enrollUidSnap.docs.forEach(d => enrollMap.set(d.id, { id: d.id, ...d.data() }));
      }
      const allEnrollments = Array.from(enrollMap.values()).filter(e => matchesUser(user, e.studentEmail, e.studentName, e.studentId));

      const courseItems: TranscriptCourseItem[] = [];

      // Add verified certificates first
      allCerts.forEach(cert => {
        courseItems.push({
          id: cert.id,
          courseName: cert.courseName || 'Professional Course',
          domain: cert.domain || 'Software & AI Track',
          completionDate: cert.endDate || cert.issueDate || new Date().toISOString().split('T')[0],
          grade: cert.grade || cert.marksPercentage || 'A+ (Distinction)',
          certificateId: cert.certificateId || cert.id,
          status: 'Certified & Verified',
        });
      });

      // Add any enrolled courses that are completed but may not have separate cert document
      allEnrollments.forEach(en => {
        if (!courseItems.some(c => c.courseName.toLowerCase() === en.courseName?.toLowerCase())) {
          courseItems.push({
            id: en.id,
            courseName: en.courseName || 'Specialized Track',
            domain: en.domain || 'Technology & Engineering',
            completionDate: en.completedAt || en.createdAt ? new Date().toISOString().split('T')[0] : 'In Progress',
            grade: en.status === 'Completed' ? 'Completed' : 'Enrolled',
            status: en.status || 'Active',
          });
        }
      });

      // 2. Compile Webinars & Bootcamps
      const webinarItems: TranscriptWebinarItem[] = attendeeSnap.docs
        .map(d => {
          const data = d.data();
          const daily = data.dailyAttendance || {};
          const totalDays = data.totalDays || 15;
          const attendedDays = Object.values(daily).filter(v => v === 'Present').length;
          const percentage = Math.round((attendedDays / (totalDays > 0 ? totalDays : 1)) * 100);

          return {
            id: d.id,
            title: data.webinarTitle || 'AI & Tech Bootcamp',
            totalDays,
            attendedDays,
            percentage,
            completionDate: data.completedAt ? new Date(data.completedAt.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            certificateId: data.certificateId,
            status: data.certificateIssued ? 'Certified' : percentage >= 75 ? 'Eligible' : 'Completed',
          };
        })
        .filter(w => matchesUser(user, (w as any).email, (w as any).studentName, (w as any).studentId));

      const year = new Date().getFullYear();
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const transcriptId = `FC-TR-${year}-${randomCode}`;

      const transcript: StudentTranscriptData = {
        studentName: user.displayName || user.email?.split('@')[0] || 'Candidate',
        studentEmail: userEmailClean,
        studentPhone: user.phone || 'N/A',
        collegeName: user.school || 'FutureCode AI Academy',
        degree: user.degree || 'Advanced Engineering Track',
        yearOfStudy: user.yearOfStudy || 'Graduate Program',
        studentId: user.uid,
        transcriptId,
        issueDate: new Date().toISOString().split('T')[0],
        courses: courseItems,
        webinars: webinarItems,
        totalCertificates: allCerts.length + webinarItems.filter(w => w.status === 'Certified').length,
      };

      setTranscriptData(transcript);
      toast.success('Transcript compiled successfully!', { id: toastId });
      return transcript;
    } catch (err) {
      console.error('Error generating transcript:', err);
      toast.error('Failed to compile transcript', { id: toastId });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    transcriptData,
    loading,
    fetchTranscript,
  };
}
