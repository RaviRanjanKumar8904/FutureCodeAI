import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, getDocs, deleteDoc, doc, query, where, writeBatch, addDoc, setDoc, getDoc, serverTimestamp, orderBy, updateDoc } from 'firebase/firestore';
import {
  Users, Search, Trash2, Mail, Eye, ShieldAlert, GraduationCap, Plus,
  Download, Upload, Award, CheckSquare, Square, Calendar, Filter, X,
  Edit2, CheckCircle2, AlertCircle, Clock, Sparkles, Building2, UserCheck,
  FileSpreadsheet, ExternalLink, AlertTriangle, Check
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import StudentProfileModal from '../../components/admin/StudentProfileModal';
import EnrollStudentModal from '../../components/admin/EnrollStudentModal';
import EditStudentModal from '../../components/admin/EditStudentModal';
import CertificateModal from '../../components/certificate/CertificateModal';
import type { CertificateData } from '../../components/certificate/CourseCertificate';
import { logAdminActivity } from '../../utils/adminLogger';
import { useAuth } from '../../hooks/useAuth';
import Papa from 'papaparse';

interface Student {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: string;
  createdAt: any;
  phone?: string;
  gender?: string;
  school?: string;
  collegeName?: string;
  rollNo?: string;
  enrolledCourse?: string;
  assignedCenter?: string;
  batch?: string;
  // Enrollment metadata for timeline calculation
  enrolledAtDate?: string; // YYYY-MM-DD
  courseDuration?: string; // e.g. "3 Months"
  completionDate?: string; // YYYY-MM-DD
  isDurationCompleted?: boolean;
  daysRemaining?: number;
  // Certificate info if already issued
  certificateId?: string;
  certificateData?: CertificateData;
}

interface Enrollment {
  id: string;
  studentId: string;
  studentEmail: string;
  courseName: string;
  institute: string;
  batch: string;
  status: string;
  gender?: string;
  collegeName?: string;
  rollNo?: string;
  enrolledAt?: any;
  createdAt?: any;
}

// Utility: parse duration string into months and days
function parseDuration(durationStr?: string): { months: number; days: number } {
  if (!durationStr) return { months: 3, days: 0 };
  const s = durationStr.toLowerCase().trim();
  const numMatch = s.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1], 10) : 3;

  if (s.includes('year')) {
    return { months: num * 12, days: 0 };
  } else if (s.includes('month')) {
    return { months: num, days: 0 };
  } else if (s.includes('week')) {
    return { months: 0, days: num * 7 };
  } else if (s.includes('day')) {
    return { months: 0, days: num };
  }
  return { months: num, days: 0 };
}

// Utility: compute completion date from enrollment start date and course duration
function computeCompletionDate(startDateStr: string, durationStr?: string): string {
  try {
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return startDateStr;
    const { months, days } = parseDuration(durationStr);
    const end = new Date(start);
    if (months > 0) end.setMonth(end.getMonth() + months);
    if (days > 0) end.setDate(end.getDate() + days);
    return end.toISOString().split('T')[0];
  } catch {
    return startDateStr;
  }
}

function generateBatchOptions(): string[] {
  const batches: string[] = [];
  const now = new Date();
  for (let i = -1; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    batches.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
  }
  return batches;
}

export default function ManageStudents() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialCourse = searchParams.get('course') || '';
  const enrollName = searchParams.get('enrollName');
  const enrollEmail = searchParams.get('enrollEmail');
  const enrollPhone = searchParams.get('enrollPhone');
  const enrollGender = searchParams.get('enrollGender');
  const enrollCollege = searchParams.get('enrollCollege');
  const enrollRollNo = searchParams.get('enrollRollNo');
  const enrollCourse = searchParams.get('enrollCourse');
  const enrollCenter = searchParams.get('enrollCenter');

  const [students, setStudents] = useState<Student[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Certificate Modal Preview State
  const [previewCert, setPreviewCert] = useState<CertificateData | null>(null);
  const [showCertPreview, setShowCertPreview] = useState(false);

  // Single Certificate Issue Modal State
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueStudent, setIssueStudent] = useState<Student | null>(null);
  const [issueForm, setIssueForm] = useState({
    studentName: '',
    studentEmail: '',
    courseName: '',
    domain: '',
    gender: 'Male' as 'Male' | 'Female',
    startDate: '', // Enrollment date
    endDate: '',   // Course Completion date
    issueDate: '', // Must match Course Completion date
    grade: 'A',
    marksPercentage: '92',
  });
  const [isIssuing, setIsIssuing] = useState(false);

  // Dynamic status within issue modal based on current input values
  const isFormCompletionMet = useMemo(() => {
    if (!issueForm.endDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(issueForm.endDate);
    end.setHours(0, 0, 0, 0);
    return today >= end;
  }, [issueForm.endDate]);

  const formDaysRemaining = useMemo(() => {
    if (!issueForm.endDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(issueForm.endDate);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [issueForm.endDate]);

  // Filters
  const [filterCourse, setFilterCourse] = useState(initialCourse);
  const [filterCenter, setFilterCenter] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterCertStatus, setFilterCertStatus] = useState<'all' | 'issued' | 'pending' | 'completed' | 'in_progress'>('all');
  const [filterGender, setFilterGender] = useState<'all' | 'Male' | 'Female'>('all');
  const [showFilters, setShowFilters] = useState(Boolean(initialCourse));

  // Bulk Actions
  const [bulkBatch, setBulkBatch] = useState('');
  const [bulkCenter, setBulkCenter] = useState('');
  const csvRef = useRef<HTMLInputElement>(null);
  const batchOptions = generateBatchOptions();

  const [enrollInitialData, setEnrollInitialData] = useState<{
    studentName?: string;
    email?: string;
    phone?: string;
    gender?: string;
    collegeName?: string;
    rollNo?: string;
    courseName?: string;
    centerName?: string;
  } | undefined>(undefined);

  useEffect(() => {
    if (enrollName || enrollEmail) {
      setEnrollInitialData({
        studentName: enrollName || '',
        email: enrollEmail || '',
        phone: enrollPhone || '',
        gender: enrollGender || 'Male',
        collegeName: enrollCollege || '',
        rollNo: enrollRollNo || '',
        courseName: enrollCourse || '',
        centerName: enrollCenter || ''
      });
      setIsEnrollOpen(true);
    }
  }, [enrollName, enrollEmail, enrollPhone, enrollGender, enrollCollege, enrollRollNo, enrollCourse, enrollCenter]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersSnap, enrollSnap, certsSnap, coursesSnap, centersSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        getDocs(collection(db, 'enrollments')),
        getDocs(collection(db, 'certificates')),
        getDocs(query(collection(db, 'courses'), orderBy('title'))),
        getDocs(query(collection(db, 'collaborators'), orderBy('name'))),
      ]);

      const enrollData = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
      const certsData = certsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const coursesData = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setCourses(coursesData);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let data: Student[] = usersSnap.docs.map(d => {
        const raw = d.data();
        const enroll = enrollData.find(e => e.studentId === d.id || (raw.email && e.studentEmail?.toLowerCase() === raw.email.toLowerCase()));
        
        // Find matched course to extract standard duration
        const enrolledCourseName = enroll?.courseName || raw.enrolledCourse || '';
        const matchedCourse = coursesData.find(c =>
          c.title?.toLowerCase() === enrolledCourseName.toLowerCase() ||
          c.courseName?.toLowerCase() === enrolledCourseName.toLowerCase()
        );
        const courseDuration = matchedCourse?.duration || '3 Months';

        // 1. Enrollment Date / Course Start Date
        let enrollDateObj: Date = new Date();
        const rawTimestamp = enroll?.enrolledAt || enroll?.createdAt || raw.createdAt;
        if (rawTimestamp) {
          if (typeof rawTimestamp.toDate === 'function') enrollDateObj = rawTimestamp.toDate();
          else if (rawTimestamp.seconds) enrollDateObj = new Date(rawTimestamp.seconds * 1000);
          else if (typeof rawTimestamp === 'string') enrollDateObj = new Date(rawTimestamp);
        }
        const enrolledAtDate = enrollDateObj.toISOString().split('T')[0];

        // 2. Course Completion Date (Start Date + Course Duration)
        const completionDate = computeCompletionDate(enrolledAtDate, courseDuration);
        const completionDateObj = new Date(completionDate);
        completionDateObj.setHours(0, 0, 0, 0);

        // 3. Duration Completion Status
        const isDurationCompleted = today >= completionDateObj || enroll?.status?.toLowerCase() === 'completed';
        const diffTime = completionDateObj.getTime() - today.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        // 4. Existing Certificate matching
        const cert = certsData.find(c =>
          !c.revoked && (
            (raw.email && c.studentEmail && c.studentEmail.toLowerCase() === raw.email.toLowerCase()) ||
            (c.studentName && raw.displayName && c.studentName.toLowerCase().trim() === raw.displayName.toLowerCase().trim())
          )
        );

        let certPayload: CertificateData | undefined = undefined;
        if (cert) {
          // Both completion date and issue date must match
          const finalIssueDate = cert.endDate || cert.issueDate || completionDate;
          certPayload = {
            id: cert.id,
            certificateId: cert.certificateId || cert.id,
            studentName: cert.studentName || raw.displayName,
            studentEmail: cert.studentEmail || raw.email,
            gender: cert.gender || raw.gender || enroll?.gender || 'Male',
            courseName: cert.courseName || enrolledCourseName || 'Full Stack Web Development',
            domain: cert.domain || cert.courseName || enrolledCourseName,
            startDate: cert.startDate || enrolledAtDate,
            endDate: finalIssueDate,
            issueDate: finalIssueDate,
            grade: cert.grade,
            marksPercentage: cert.marksPercentage,
          };
        }

        return {
          id: d.id,
          ...raw,
          gender: raw.gender || enroll?.gender || '',
          collegeName: raw.collegeName || raw.school || enroll?.collegeName || '',
          rollNo: raw.rollNo || enroll?.rollNo || '',
          enrolledCourse: enrolledCourseName,
          assignedCenter: enroll?.institute || '',
          batch: enroll?.batch || '',
          enrolledAtDate,
          courseDuration,
          completionDate,
          isDurationCompleted,
          daysRemaining,
          certificateId: cert ? (cert.certificateId || cert.id) : undefined,
          certificateData: certPayload,
        } as Student;
      });

      data.sort((a, b) => {
        const getMs = (val: any) => {
          if (!val) return 0;
          if (typeof val.toMillis === 'function') return val.toMillis();
          if (val.seconds) return val.seconds * 1000;
          return Date.now();
        };
        return getMs(b.createdAt) - getMs(a.createdAt);
      });

      setStudents(data);
      setCenters(centersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((c: any) => c.isApproved));
    } catch (error) {
      console.error('Error fetching students & certificates:', error);
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Open Issue Certificate Modal for a specific student
  const handleOpenIssueModal = (student: Student) => {
    if (student.certificateId && student.certificateData) {
      // Already issued -> Open preview directly
      setPreviewCert(student.certificateData);
      setShowCertPreview(true);
      toast.success('Certificate already issued. Showing preview.', { icon: '📜' });
      return;
    }

    const course = student.enrolledCourse || 'Full Stack Web Development';
    const startDate = student.enrolledAtDate || new Date().toISOString().split('T')[0];
    const completionDate = student.completionDate || computeCompletionDate(startDate, student.courseDuration);

    setIssueStudent(student);
    setIssueForm({
      studentName: student.displayName || '',
      studentEmail: student.email || '',
      courseName: course,
      domain: course,
      gender: (student.gender === 'Female' ? 'Female' : 'Male'),
      startDate,                    // Start Date = Enrollment Date
      endDate: completionDate,      // Course Completion Date
      issueDate: completionDate,    // Issue Date = Course Completion Date (Strictly identical)
      grade: 'A',
      marksPercentage: '92',
    });
    setIssueModalOpen(true);
  };

  // Submit Issue Certificate
  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueStudent) return;
    setIsIssuing(true);
    const toastId = toast.loading('Generating unique certificate...');

    try {
      const year = new Date().getFullYear();
      let certId = '';
      let attempts = 0;
      do {
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
        certId = `FC-${year}-${rand}`;
        const existing = await getDoc(doc(db, 'certificates', certId));
        if (!existing.exists()) break;
        attempts++;
      } while (attempts < 10);

      // Course Completion Date and Issue Date must be strictly identical
      const completionDate = issueForm.endDate.trim() || issueForm.issueDate.trim();

      const certDocData = {
        certificateId: certId,
        studentName: issueForm.studentName.trim(),
        studentEmail: issueForm.studentEmail.trim(),
        courseName: issueForm.courseName.trim(),
        domain: issueForm.domain.trim() || issueForm.courseName.trim(),
        gender: issueForm.gender,
        startDate: issueForm.startDate.trim(), // Enrollment date
        endDate: completionDate,              // Course Completion date
        issueDate: completionDate,            // Issue date (Identical to Completion date)
        grade: issueForm.grade,
        marksPercentage: issueForm.marksPercentage,
        issuedBy: user?.email || 'Admin',
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'certificates', certId), certDocData);
      logAdminActivity(user?.email, 'ISSUED', `Certificate ${certId} for ${issueForm.studentName}`);

      toast.success(`Certificate ${certId} issued!`, { id: toastId });
      setIssueModalOpen(false);
      
      // Open preview right away
      setPreviewCert({
        id: certId,
        ...certDocData,
      });
      setShowCertPreview(true);

      fetchAll();
    } catch (error) {
      console.error('Error issuing certificate:', error);
      toast.error('Failed to issue certificate', { id: toastId });
    } finally {
      setIsIssuing(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete student profile for ${name}?`)) return;
    const tid = toast.loading('Deleting student...');
    try {
      await deleteDoc(doc(db, 'users', id));
      logAdminActivity(user?.email, 'DELETED', `Student Profile: ${name}`);
      toast.success('Student deleted', { id: tid });
      fetchAll();
    } catch { toast.error('Failed to delete', { id: tid }); }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} student(s)? This cannot be undone.`)) return;
    const tid = toast.loading(`Deleting ${selectedIds.size} students...`);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => batch.delete(doc(db, 'users', id)));
      await batch.commit();
      logAdminActivity(user?.email, 'BULK_DELETED', `${selectedIds.size} students`);
      toast.success(`${selectedIds.size} students deleted`, { id: tid });
      setSelectedIds(new Set());
      fetchAll();
    } catch { toast.error('Failed to bulk delete', { id: tid }); }
  };

  // Bulk certificate issue (checks duration completion)
  const handleBulkCertificate = async () => {
    if (selectedIds.size === 0) return;
    const selected = students.filter(s => selectedIds.has(s.id));
    const eligible = selected.filter(s => !s.certificateId && s.isDurationCompleted);

    if (eligible.length === 0) {
      const pendingDuration = selected.filter(s => !s.certificateId && !s.isDurationCompleted);
      if (pendingDuration.length > 0) {
        toast.error(`Cannot issue yet: ${pendingDuration.length} student(s) have not completed course duration.`);
      } else {
        toast.error('All selected students already have certificates issued.');
      }
      return;
    }

    if (!window.confirm(`Issue certificates for ${eligible.length} course-completed student(s)?`)) return;
    
    const tid = toast.loading(`Issuing ${eligible.length} certificates...`);
    try {
      const batch = writeBatch(db);
      const year = new Date().getFullYear();
      for (const s of eligible) {
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
        const certId = `FC-${year}-${rand}`;
        const certRef = doc(db, 'certificates', certId);
        const startDate = s.enrolledAtDate || new Date().toISOString().split('T')[0];
        const completionDate = s.completionDate || computeCompletionDate(startDate, s.courseDuration);

        batch.set(certRef, {
          certificateId: certId,
          studentName: s.displayName || s.email,
          studentEmail: s.email || '',
          courseName: s.enrolledCourse || 'Full Stack Web Development',
          domain: s.enrolledCourse || 'Full Stack Web Development',
          gender: s.gender || 'Male',
          startDate,
          endDate: completionDate,
          issueDate: completionDate,
          grade: 'A',
          marksPercentage: '92',
          issuedBy: `Admin (${user?.email || 'Bulk'})`,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
      logAdminActivity(user?.email, 'BULK_ISSUED', `${eligible.length} certificates`);
      toast.success(`Successfully issued ${eligible.length} certificates!`, { id: tid });
      setSelectedIds(new Set());
      fetchAll();
    } catch { toast.error('Failed to issue certificates', { id: tid }); }
  };

  // Bulk batch change
  const handleBulkBatchChange = async (batchValue?: string) => {
    const targetBatch = batchValue || bulkBatch;
    if (!targetBatch || selectedIds.size === 0) return;
    const tid = toast.loading(`Setting batch to ${targetBatch}...`);
    try {
      for (const id of selectedIds) {
        const s = students.find(st => st.id === id);
        if (!s) continue;
        const enrollQ = query(collection(db, 'enrollments'), where('studentId', '==', id));
        const enrollSnap = await getDocs(enrollQ);
        if (!enrollSnap.empty) {
          await updateDoc(doc(db, 'enrollments', enrollSnap.docs[0].id), { batch: targetBatch, batchTiming: targetBatch });
        } else {
          await addDoc(collection(db, 'enrollments'), {
            studentId: id, studentEmail: s.email, studentName: s.displayName || '',
            courseName: s.enrolledCourse || 'Full Stack Web Development', institute: 'FutureCodeAI (Online)', centerId: '',
            city: 'Online', batch: targetBatch, batchTiming: targetBatch,
            status: 'Ongoing', image: '', enrolledAt: serverTimestamp(),
          });
        }
      }
      toast.success(`Batches updated to ${targetBatch}!`, { id: tid });
      setBulkBatch('');
      setSelectedIds(new Set());
      fetchAll();
    } catch { toast.error('Failed to update batches', { id: tid }); }
  };

  // Bulk center change
  const handleBulkCenterChange = async (centerIdValue?: string) => {
    const targetCenterId = centerIdValue || bulkCenter;
    if (!targetCenterId || selectedIds.size === 0) return;
    const center = centers.find(c => c.id === targetCenterId);
    if (!center) return;
    const tid = toast.loading(`Assigning center ${center.name}...`);
    try {
      const instituteId = center.linkedUserId || center.id || '';
      for (const id of selectedIds) {
        const s = students.find(st => st.id === id);
        if (!s) continue;
        const enrollQ = query(collection(db, 'enrollments'), where('studentId', '==', id));
        const enrollSnap = await getDocs(enrollQ);
        if (!enrollSnap.empty) {
          await updateDoc(doc(db, 'enrollments', enrollSnap.docs[0].id), {
            institute: center.name, centerId: center.id, instituteId, city: center.city || 'N/A',
          });
        } else {
          await addDoc(collection(db, 'enrollments'), {
            studentId: id, studentEmail: s.email, studentName: s.displayName || '',
            courseName: s.enrolledCourse || 'Full Stack Web Development', institute: center.name, centerId: center.id, instituteId,
            city: center.city || 'N/A', batch: '', batchTiming: '',
            status: 'Ongoing', image: '', enrolledAt: serverTimestamp(),
          });
        }
      }
      toast.success(`Center updated to ${center.name}!`, { id: tid });
      setBulkCenter('');
      setSelectedIds(new Set());
      fetchAll();
    } catch { toast.error('Failed', { id: tid }); }
  };

  // Export CSV (all or selected)
  const handleExportCSV = (onlySelected = false) => {
    const targetList = onlySelected
      ? students.filter(s => selectedIds.has(s.id))
      : filteredData;

    if (targetList.length === 0) {
      toast.error('No students to export');
      return;
    }

    const csvData = targetList.map(s => ({
      Name: s.displayName || '',
      Gender: s.gender || '',
      Email: s.email || '',
      Phone: s.phone || '',
      College: s.collegeName || s.school || '',
      RollNo: s.rollNo || '',
      Course: s.enrolledCourse || '',
      Center: s.assignedCenter || '',
      Batch: s.batch || '',
      EnrollmentDate: s.enrolledAtDate || '',
      CompletionDate: s.completionDate || '',
      DurationCompleted: s.isDurationCompleted ? 'Yes' : `No (${s.daysRemaining} days left)`,
      CertificateStatus: s.certificateId ? `Issued (${s.certificateId})` : 'Pending',
      RegisteredAt: s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : '',
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${onlySelected ? 'selected' : 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${targetList.length} student records exported!`);
  };

  // Import CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        if (rows.length === 0) { toast.error('Empty CSV'); return; }
        if (!window.confirm(`Import ${rows.length} student(s)?`)) return;
        const tid = toast.loading(`Importing ${rows.length} students...`);
        try {
          let count = 0;
          for (const row of rows) {
            if (!row.Email && !row.email) continue;
            const email = row.Email || row.email;
            const name = row.Name || row.name || row.StudentName || 'Imported Student';
            const userRef = await addDoc(collection(db, 'users'), {
              email, displayName: name,
              phone: row.Phone || row.phone || '',
              gender: row.Gender || row.gender || 'Male',
              collegeName: row.College || row.college || row.School || '',
              rollNo: row.RollNo || row.rollNo || row.Roll || '',
              photoURL: '', role: 'student', status: 'active',
              enrolledByAdmin: true, createdAt: serverTimestamp(),
            });
            if (row.Course || row.course) {
              await addDoc(collection(db, 'enrollments'), {
                studentId: userRef.id, studentEmail: email, studentName: name,
                gender: row.Gender || row.gender || 'Male',
                collegeName: row.College || row.college || '',
                rollNo: row.RollNo || row.rollNo || '',
                courseName: row.Course || row.course,
                institute: row.Center || row.center || 'FutureCodeAI (Online)',
                batch: row.Batch || row.batch || batchOptions[0],
                batchTiming: row.Batch || row.batch || batchOptions[0],
                status: 'Ongoing', image: '', enrolledAt: serverTimestamp(),
              });
            }
            count++;
          }
          toast.success(`${count} students imported!`, { id: tid });
          fetchAll();
        } catch { toast.error('Import failed', { id: tid }); }
        if (csvRef.current) csvRef.current.value = '';
      },
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredData.length && filteredData.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredData.map(s => s.id)));
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return students.filter(s => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        (s.displayName || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.collegeName || '').toLowerCase().includes(q) ||
        (s.rollNo || '').toLowerCase().includes(q) ||
        (s.certificateId || '').toLowerCase().includes(q);

      const matchCourse = !filterCourse || s.enrolledCourse === filterCourse;
      const matchCenter = !filterCenter || s.assignedCenter === filterCenter;
      const matchBatch = !filterBatch || s.batch === filterBatch;
      const matchCert =
        filterCertStatus === 'all' ||
        (filterCertStatus === 'issued' && Boolean(s.certificateId)) ||
        (filterCertStatus === 'pending' && !s.certificateId) ||
        (filterCertStatus === 'completed' && !s.certificateId && s.isDurationCompleted) ||
        (filterCertStatus === 'in_progress' && !s.certificateId && !s.isDurationCompleted);

      const matchGender =
        filterGender === 'all' ||
        (filterGender === 'Male' && s.gender?.toLowerCase() === 'male') ||
        (filterGender === 'Female' && s.gender?.toLowerCase() === 'female');

      return matchSearch && matchCourse && matchCenter && matchBatch && matchCert && matchGender;
    });
  }, [students, searchTerm, filterCourse, filterCenter, filterBatch, filterCertStatus, filterGender]);

  // Selected students metrics for smart floating bar
  const selectedStudents = useMemo(() => students.filter(s => selectedIds.has(s.id)), [students, selectedIds]);
  const selectedEligibleForCert = useMemo(() => selectedStudents.filter(s => !s.certificateId && s.isDurationCompleted), [selectedStudents]);
  const selectedInProgress = useMemo(() => selectedStudents.filter(s => !s.certificateId && !s.isDurationCompleted), [selectedStudents]);
  const selectedWithCert = useMemo(() => selectedStudents.filter(s => s.certificateId), [selectedStudents]);

  // Unique metadata for filters & metrics
  const uniqueCourses = useMemo(() => [...new Set(students.map(s => s.enrolledCourse).filter(Boolean))], [students]);
  const uniqueCenters = useMemo(() => [...new Set(students.map(s => s.assignedCenter).filter(Boolean))], [students]);
  const uniqueBatches = useMemo(() => [...new Set(students.map(s => s.batch).filter(Boolean))], [students]);

  // KPI Metrics
  const totalCount = students.length;
  const certifiedCount = students.filter(s => s.certificateId).length;
  const completedUncertifiedCount = students.filter(s => !s.certificateId && s.isDurationCompleted).length;
  const inProgressCount = students.filter(s => !s.certificateId && !s.isDurationCompleted).length;
  const maleCount = students.filter(s => s.gender?.toLowerCase() === 'male').length;
  const femaleCount = students.filter(s => s.gender?.toLowerCase() === 'female').length;
  const activeBatchesCount = uniqueBatches.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Toaster position="top-center" />
      <input type="file" ref={csvRef} accept=".csv" className="hidden" onChange={handleImportCSV} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 shadow-sm">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              Student Management
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                {totalCount} Total
              </span>
            </h1>
            <p className="text-slate-500 font-medium text-xs sm:text-sm">
              Enrollment tracking, duration verification, and verified course completion certificate generation.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsEnrollOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 active:scale-95"
          >
            <Plus size={16} /> Enroll Student
          </button>
          <button
            onClick={() => handleExportCSV(false)}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => csvRef.current?.click()}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm active:scale-95"
            title="Import Students from CSV"
          >
            <Upload size={16} />
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Students */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">
            <GraduationCap size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Students</span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900">{totalCount}</div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <UserCheck size={11} /> 100% Enrolled
            </span>
          </div>
        </div>

        {/* Active Batches */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold">
            <Calendar size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Active Batches</span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900">{activeBatchesCount}</div>
            <span className="text-[11px] text-indigo-600 font-semibold truncate block">
              {uniqueBatches[0] ? `Latest: ${uniqueBatches[0]}` : 'Flexible Cohorts'}
            </span>
          </div>
        </div>

        {/* Certificates Issued */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold">
            <Award size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Certificates</span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {certifiedCount} <span className="text-xs font-medium text-slate-400">/ {totalCount}</span>
            </div>
            <span className="text-[11px] text-amber-700 font-semibold">
              {completedUncertifiedCount > 0 ? `${completedUncertifiedCount} ready to issue` : `${Math.round((certifiedCount / (totalCount || 1)) * 100)}% Issued`}
            </span>
          </div>
        </div>

        {/* Course Duration Status */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Duration Status</span>
            <div className="text-base sm:text-lg font-extrabold text-slate-900">
              {certifiedCount + completedUncertifiedCount} Completed
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {inProgressCount} in progress
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col gap-3 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Search name, email, roll, cert ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-medium w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              />
            </div>

            {/* Quick Filter Toggles */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Certificate & Completion Filter Quick Pills */}
              <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-white text-xs font-bold shadow-sm">
                <button
                  onClick={() => setFilterCertStatus('all')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors ${filterCertStatus === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  All ({totalCount})
                </button>
                <button
                  onClick={() => setFilterCertStatus('issued')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${filterCertStatus === 'issued' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <Award size={12} /> Issued ({certifiedCount})
                </button>
                <button
                  onClick={() => setFilterCertStatus('completed')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${filterCertStatus === 'completed' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  title="Course Duration Completed - Ready for Certificate"
                >
                  <Check size={12} /> Completed ({completedUncertifiedCount})
                </button>
                <button
                  onClick={() => setFilterCertStatus('in_progress')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${filterCertStatus === 'in_progress' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  title="Course still in progress"
                >
                  <Clock size={12} /> In Progress ({inProgressCount})
                </button>
              </div>

              {/* Advanced Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <Filter size={14} /> Filters
              </button>
            </div>
          </div>

          {/* Collapsible Filter Row */}
          {showFilters && (
            <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-200/60 animate-in fade-in duration-150">
              <select
                value={filterBatch}
                onChange={e => setFilterBatch(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Batches</option>
                {uniqueBatches.map(b => (
                  <option key={b} value={b}>Batch: {b}</option>
                ))}
              </select>

              <select
                value={filterCourse}
                onChange={e => setFilterCourse(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Courses</option>
                {uniqueCourses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={filterCenter}
                onChange={e => setFilterCenter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Centers</option>
                {uniqueCenters.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={filterGender}
                onChange={e => setFilterGender(e.target.value as any)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Genders</option>
                <option value="Male">Male only</option>
                <option value="Female">Female only</option>
              </select>

              {(filterCourse || filterCenter || filterBatch || filterGender !== 'all' || filterCertStatus !== 'all') && (
                <button
                  onClick={() => {
                    setFilterCourse('');
                    setFilterCenter('');
                    setFilterBatch('');
                    setFilterGender('all');
                    setFilterCertStatus('all');
                  }}
                  className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <X size={13} /> Reset Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                <th className="p-3.5 pl-4 w-10">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-indigo-600">
                    {selectedIds.size === filteredData.length && filteredData.length > 0 ? (
                      <CheckSquare size={17} className="text-indigo-600" />
                    ) : (
                      <Square size={17} />
                    )}
                  </button>
                </th>
                <th className="p-3.5">Student Information</th>
                <th className="p-3.5 hidden md:table-cell">Timeline & Duration</th>
                <th className="p-3.5 hidden lg:table-cell">Course & Center</th>
                <th className="p-3.5 text-center">Certificate Status</th>
                <th className="p-3.5 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading students and course timelines...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-3 mx-auto">
                      <Users size={28} />
                    </div>
                    <p className="text-slate-900 font-bold text-base mb-0.5">No Students Found</p>
                    <p className="text-slate-500 text-xs">Try adjusting your search terms or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredData.map(student => {
                  const hasCert = Boolean(student.certificateId);
                  const isSelected = selectedIds.has(student.id);
                  const isCompleted = student.isDurationCompleted;

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 pl-4 align-middle">
                        <button onClick={() => toggleSelect(student.id)} className="text-slate-400 hover:text-indigo-600">
                          {isSelected ? <CheckSquare size={17} className="text-indigo-600" /> : <Square size={17} />}
                        </button>
                      </td>

                      {/* Student Profile & Details */}
                      <td className="p-3.5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-50 text-indigo-700 flex items-center justify-center font-extrabold text-base shrink-0 shadow-inner border border-indigo-200/50">
                            {student.displayName ? student.displayName.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm truncate">{student.displayName || 'Unnamed Student'}</span>
                              {student.gender && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${student.gender.toLowerCase() === 'female' ? 'bg-pink-50 text-pink-700 border border-pink-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                  {student.gender}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                              <Mail size={12} className="shrink-0 text-slate-400" /> {student.email}
                            </div>
                            {(student.collegeName || student.rollNo) && (
                              <div className="text-[11px] font-semibold text-slate-600 mt-0.5 truncate">
                                🏫 {student.collegeName || 'College'} {student.rollNo ? `• Roll: ${student.rollNo}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Timeline: Enrollment Start -> Completion Date */}
                      <td className="p-3.5 align-middle hidden md:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                            <Calendar size={13} className="text-indigo-600" />
                            <span>Start: {student.enrolledAtDate || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span>Duration: <strong className="text-slate-700">{student.courseDuration || '3 Months'}</strong></span>
                            <span>•</span>
                            <span>Ends: <strong className="text-slate-700">{student.completionDate}</strong></span>
                          </div>
                        </div>
                      </td>

                      {/* Course & Center */}
                      <td className="p-3.5 align-middle hidden lg:table-cell">
                        <div className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                          {student.enrolledCourse || 'General Curriculum'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <Building2 size={11} className="text-slate-400" /> {student.assignedCenter || 'Online Platform'}
                          {student.batch && <span className="text-slate-400 font-mono">({student.batch})</span>}
                        </div>
                      </td>

                      {/* Certificate Status with Direct Action */}
                      <td className="p-3.5 align-middle text-center">
                        {hasCert ? (
                          <button
                            onClick={() => {
                              if (student.certificateData) {
                                setPreviewCert(student.certificateData);
                                setShowCertPreview(true);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm cursor-pointer"
                            title="Certificate Issued - Click to Preview & Download"
                          >
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Issued</span>
                            <span className="font-mono text-[10px] text-emerald-800/80">({student.certificateId})</span>
                          </button>
                        ) : isCompleted ? (
                          <button
                            onClick={() => handleOpenIssueModal(student)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors shadow-sm cursor-pointer"
                            title="Duration Completed! Click to Issue Certificate"
                          >
                            <Check size={13} className="text-emerald-600" />
                            <span>Completed</span>
                            <span className="text-[10px] bg-amber-200/60 px-1 rounded text-amber-900 font-extrabold">+ Issue Cert</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenIssueModal(student)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm cursor-pointer"
                            title={`Course in progress. Completes on ${student.completionDate} (${student.daysRemaining} days left). Click to view.`}
                          >
                            <Clock size={12} className="text-blue-600" />
                            <span>In Progress</span>
                            <span className="text-[10px] text-blue-600 font-mono font-bold">({student.daysRemaining}d left)</span>
                          </button>
                        )}
                      </td>

                      {/* Row Action Buttons */}
                      <td className="p-3.5 pr-6 align-middle text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1-Click Certificate Action */}
                          {hasCert ? (
                            <button
                              onClick={() => {
                                if (student.certificateData) {
                                  setPreviewCert(student.certificateData);
                                  setShowCertPreview(true);
                                }
                              }}
                              className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/60"
                              title="View & Download Issued Certificate"
                            >
                              <Award size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenIssueModal(student)}
                              className={`p-1.5 rounded-lg transition-colors border ${isCompleted ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200/60' : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200/60'}`}
                              title={isCompleted ? 'Issue Certificate (Course Completed)' : `Issue Certificate (Completes on ${student.completionDate})`}
                            >
                              <Award size={16} />
                            </button>
                          )}

                          {/* Profile View */}
                          <button
                            onClick={() => { setSelectedStudent(student); setIsProfileOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Full Profile"
                          >
                            <Eye size={16} />
                          </button>

                          {/* Edit Student */}
                          <button
                            onClick={() => { setSelectedStudent(student); setIsEditOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit Student Info"
                          >
                            <Edit2 size={16} />
                          </button>

                          {/* Delete Student */}
                          <button
                            onClick={() => handleDelete(student.id, student.displayName || 'student')}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Student Record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern High-End Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0d121c]/95 backdrop-blur-xl text-white px-4 sm:px-6 py-3 rounded-2xl sm:rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.6)] flex items-center gap-2.5 sm:gap-3.5 z-50 flex-wrap justify-center border border-amber-500/30 animate-in slide-in-from-bottom-4 duration-200 max-w-[95vw]">
          {/* Selection Badge & Count */}
          <div className="flex items-center gap-2 pr-1 border-r border-slate-700/80">
            <span className="font-extrabold text-xs sm:text-sm text-amber-300 whitespace-nowrap">
              {selectedIds.size} Selected
            </span>
            <div className="hidden sm:flex items-center gap-1 text-[10px]">
              {selectedWithCert.length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {selectedWithCert.length} Issued
                </span>
              )}
              {selectedEligibleForCert.length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {selectedEligibleForCert.length} Completed
                </span>
              )}
              {selectedInProgress.length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                  {selectedInProgress.length} In Progress
                </span>
              )}
            </div>
          </div>

          {/* Smart Certificate Action Button */}
          {selectedEligibleForCert.length > 0 ? (
            <button
              onClick={handleBulkCertificate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-xl text-xs font-extrabold transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Award size={14} /> Issue Certs ({selectedEligibleForCert.length})
            </button>
          ) : selectedStudents.length === 1 && selectedStudents[0].certificateData ? (
            <button
              onClick={() => {
                setPreviewCert(selectedStudents[0].certificateData!);
                setShowCertPreview(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Award size={14} /> View Certificate
            </button>
          ) : selectedInProgress.length > 0 ? (
            <button
              onClick={() => toast.error(`Cannot issue: ${selectedInProgress.length} student(s) course duration is still in progress.`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              <Clock size={13} className="text-blue-400" /> {selectedInProgress.length} In Progress
            </button>
          ) : (
            <button
              onClick={() => handleExportCSV(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 size={13} className="text-emerald-400" /> All {selectedStudents.length} Certified
            </button>
          )}

          {/* Export Selected CSV */}
          <button
            onClick={() => handleExportCSV(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
            title="Export Selected Students to CSV"
          >
            <FileSpreadsheet size={13} className="text-indigo-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Quick Batch Assignment */}
          <div className="flex items-center gap-1">
            <select
              value={bulkBatch}
              onChange={e => {
                const val = e.target.value;
                setBulkBatch(val);
                if (val) handleBulkBatchChange(val);
              }}
              className="bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/40 cursor-pointer"
            >
              <option value="">Assign Batch...</option>
              {batchOptions.map(b => (
                <option key={b} value={b}>Batch: {b}</option>
              ))}
            </select>
          </div>

          {/* Quick Center Assignment */}
          <div className="flex items-center gap-1">
            <select
              value={bulkCenter}
              onChange={e => {
                const val = e.target.value;
                setBulkCenter(val);
                if (val) handleBulkCenterChange(val);
              }}
              className="bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500/40 cursor-pointer"
            >
              <option value="">Assign Center...</option>
              {centers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Delete Action */}
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1 px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors active:scale-95 cursor-pointer whitespace-nowrap shadow-sm shadow-rose-900/30"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>

          {/* Deselect All (X) */}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors border border-transparent hover:border-slate-700"
            title="Deselect All"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 1-Click Issue Certificate Modal */}
      {issueModalOpen && issueStudent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 flex items-center justify-center font-bold">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Issue Official Certificate</h3>
                  <p className="text-xs text-slate-500 font-medium">For {issueStudent.displayName || issueStudent.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIssueModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center shadow-sm"
              >
                <X size={16} />
              </button>
            </div>

            {/* Reactive Course Duration Status Banner */}
            {!isFormCompletionMet ? (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-800 animate-in fade-in duration-150">
                <AlertTriangle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Course Duration In Progress</span>
                  <span>
                    Start: <strong>{issueForm.startDate}</strong> ({issueStudent.courseDuration || '3 Months'}). Scheduled completion date: <strong>{issueForm.endDate}</strong> ({formDaysRemaining} days remaining).
                  </span>
                </div>
              </div>
            ) : (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-150">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Course Duration Completed</span>
                  <span>
                    Completed on <strong>{issueForm.endDate}</strong>. Certificate is ready for official issuance.
                  </span>
                </div>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleSubmitIssue} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student Name *</label>
                  <input
                    type="text"
                    required
                    value={issueForm.studentName}
                    onChange={e => setIssueForm({ ...issueForm, studentName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={issueForm.gender}
                    onChange={e => setIssueForm({ ...issueForm, gender: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                  >
                    <option value="Male">Male (He / His)</option>
                    <option value="Female">Female (She / Her)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student Email</label>
                <input
                  type="email"
                  value={issueForm.studentEmail}
                  onChange={e => setIssueForm({ ...issueForm, studentEmail: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Program / Course *</label>
                  <input
                    type="text"
                    required
                    value={issueForm.courseName}
                    onChange={e => {
                      const newCourseName = e.target.value;
                      const matched = courses.find(c =>
                        c.title?.toLowerCase() === newCourseName.toLowerCase() ||
                        c.courseName?.toLowerCase() === newCourseName.toLowerCase()
                      );
                      const dur = matched?.duration || issueStudent.courseDuration || '3 Months';
                      const newEnd = computeCompletionDate(issueForm.startDate, dur);
                      setIssueForm({
                        ...issueForm,
                        courseName: newCourseName,
                        domain: newCourseName,
                        endDate: newEnd,
                        issueDate: newEnd,
                      });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specialization / Domain</label>
                  <input
                    type="text"
                    value={issueForm.domain}
                    onChange={e => setIssueForm({ ...issueForm, domain: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Start Date (Enrollment Date) and Completion/Issue Date (Auto-calculated on change) */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar size={12} className="text-indigo-600" /> Start Date (Enrollment) *
                  </label>
                  <input
                    type="date"
                    required
                    value={issueForm.startDate}
                    onChange={e => {
                      const newStart = e.target.value;
                      const newEnd = computeCompletionDate(newStart, issueStudent.courseDuration);
                      setIssueForm({
                        ...issueForm,
                        startDate: newStart,
                        endDate: newEnd,
                        issueDate: newEnd,
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Changing auto-updates end date</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600" /> Completion &amp; Issue Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={issueForm.endDate}
                    onChange={e => {
                      const newEnd = e.target.value;
                      setIssueForm({
                        ...issueForm,
                        endDate: newEnd,
                        issueDate: newEnd, // Keep synchronized
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                  />
                  <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">Identical on certificate</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Grade</label>
                  <input
                    type="text"
                    value={issueForm.grade}
                    onChange={e => setIssueForm({ ...issueForm, grade: e.target.value })}
                    placeholder="E.g. A+"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Marks %</label>
                  <input
                    type="text"
                    value={issueForm.marksPercentage}
                    onChange={e => setIssueForm({ ...issueForm, marksPercentage: e.target.value })}
                    placeholder="E.g. 94"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIssuing}
                  className="flex-1 py-2.5 rounded-xl font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isIssuing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Issuing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Generate Certificate
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Preview / Download Modal */}
      <CertificateModal
        isOpen={showCertPreview}
        onClose={() => {
          setShowCertPreview(false);
          setPreviewCert(null);
        }}
        certificate={previewCert}
      />

      {/* Student Profile Modal */}
      <StudentProfileModal
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
      />

      {/* Enroll Student Modal */}
      <EnrollStudentModal
        isOpen={isEnrollOpen}
        onClose={() => {
          setIsEnrollOpen(false);
          setEnrollInitialData(undefined);
        }}
        onSuccess={() => {
          fetchAll();
          logAdminActivity(user?.email, 'CREATED', 'Student Enrollment');
        }}
        initialData={enrollInitialData}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedStudent(null);
        }}
        onSuccess={() => {
          fetchAll();
          logAdminActivity(user?.email, 'UPDATED', `Student Profile: ${selectedStudent?.displayName || selectedStudent?.email}`);
        }}
        student={selectedStudent}
      />
    </div>
  );
}
