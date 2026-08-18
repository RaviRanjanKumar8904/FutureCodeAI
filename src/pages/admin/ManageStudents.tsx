import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../firebase/config';
import {
  collection,
  getDocs,
  doc,
  query,
  where,
  writeBatch,
  addDoc,
  serverTimestamp,
  orderBy,
  updateDoc
} from 'firebase/firestore';
import {
  Users,
  Plus,
  Download,
  Upload,
  Award,
  Calendar,
  GraduationCap,
  CheckCircle2,
  UserCheck,
  HelpCircle
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import StudentProfileModal from '../../components/admin/StudentProfileModal';
import EnrollStudentModal from '../../components/admin/EnrollStudentModal';
import EditStudentModal from '../../components/admin/EditStudentModal';
import ConfirmModal from '../../components/admin/ConfirmModal';
import CertificateModal from '../../components/certificate/CertificateModal';
import type { CertificateData } from '../../components/certificate/CourseCertificate';
import { logAdminActivity } from '../../utils/adminLogger';
import { useAuth } from '../../hooks/useAuth';
import { exportCSV, downloadTemplateCSV, parseCSV, resolveHeaderValue } from '../../utils/csv';
import { sendNotification } from '../../utils/notificationService';
import type { Student, Enrollment } from '../../components/admin/students/types';
import { computeCompletionDate, generateBatchOptions } from '../../components/admin/students/types';
import StudentFilters from '../../components/admin/students/StudentFilters';
import StudentTable from '../../components/admin/students/StudentTable';
import StudentBulkActionsBar from '../../components/admin/students/StudentBulkActionsBar';
import IssueCertificateModal from '../../components/admin/students/IssueCertificateModal';
import StudentCsvGuideModal from '../../components/admin/students/StudentCsvGuideModal';

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
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'primary' | 'warning';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

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
    startDate: '',
    endDate: '',
    issueDate: '',
    grade: 'A',
    marksPercentage: '92',
  });
  const [isIssuing, setIsIssuing] = useState(false);

  // Filters
  const [filterCourse, setFilterCourse] = useState(initialCourse);
  const [filterCenter, setFilterCenter] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterCertStatus, setFilterCertStatus] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');

  // Bulk Actions
  const [bulkBatch, setBulkBatch] = useState('');
  const [bulkCenter, setBulkCenter] = useState('');
  const [batchOptions] = useState<string[]>(generateBatchOptions());

  const csvRef = useRef<HTMLInputElement>(null);

  // Auto-trigger enroll modal with query parameters
  const [enrollInitialData, setEnrollInitialData] = useState<any>(undefined);
  useEffect(() => {
    if (enrollEmail || enrollName || enrollCourse) {
      setEnrollInitialData({
        name: enrollName || '',
        email: enrollEmail || '',
        phone: enrollPhone || '',
        gender: enrollGender || 'Male',
        collegeName: enrollCollege || '',
        rollNo: enrollRollNo || '',
        course: enrollCourse || '',
        center: enrollCenter || '',
      });
      setIsEnrollOpen(true);
    }
  }, [enrollEmail, enrollName, enrollPhone, enrollGender, enrollCollege, enrollRollNo, enrollCourse, enrollCenter]);

  // Master fetch function
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersSnap, enrollSnap, coursesSnap, collabSnap, certsSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'enrollments')),
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'collaborators')),
        getDocs(collection(db, 'certificates')),
      ]);

      const coursesMap = new Map<string, any>();
      coursesSnap.docs.forEach((d) => coursesMap.set(d.id, { id: d.id, ...d.data() }));
      const coursesList = Array.from(coursesMap.values());
      setCourses(coursesList);

      const centersList = collabSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCenters(centersList);

      const enrollmentsByEmail = new Map<string, Enrollment[]>();
      enrollSnap.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() } as Enrollment;
        const email = (data.studentEmail || '').toLowerCase().trim();
        if (email) {
          const list = enrollmentsByEmail.get(email) || [];
          list.push(data);
          enrollmentsByEmail.set(email, list);
        }
      });

      const certsByEmail = new Map<string, any>();
      certsSnap.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() } as any;
        if (!data.revoked) {
          const email = (data.studentEmail || '').toLowerCase().trim();
          if (email) certsByEmail.set(email, data);
        }
      });

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const studentsList: Student[] = usersSnap.docs.map((d) => {
        const u = d.data();
        const email = (u.email || '').toLowerCase().trim();
        const studentEnrollments = enrollmentsByEmail.get(email) || [];
        const primaryEnrollment = studentEnrollments[0];

        let enrolledAtDateStr = '';
        if (primaryEnrollment?.enrolledAt) {
          const dt = primaryEnrollment.enrolledAt.toDate
            ? primaryEnrollment.enrolledAt.toDate()
            : new Date(primaryEnrollment.enrolledAt);
          if (!isNaN(dt.getTime())) enrolledAtDateStr = dt.toISOString().split('T')[0];
        } else if (u.createdAt) {
          const dt = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
          if (!isNaN(dt.getTime())) enrolledAtDateStr = dt.toISOString().split('T')[0];
        } else {
          enrolledAtDateStr = new Date().toISOString().split('T')[0];
        }

        const courseTitle = primaryEnrollment?.courseName || u.enrolledCourse || '';
        const matchedCourse = coursesList.find(
          (c) =>
            c.title?.toLowerCase() === courseTitle.toLowerCase() ||
            c.courseName?.toLowerCase() === courseTitle.toLowerCase()
        );
        const courseDuration = matchedCourse?.duration || '3 Months';
        const completionDateStr = computeCompletionDate(enrolledAtDateStr, courseDuration);

        const compDate = new Date(completionDateStr);
        compDate.setHours(0, 0, 0, 0);

        const isCompleted = !isNaN(compDate.getTime()) && now >= compDate;
        const daysRem =
          !isNaN(compDate.getTime()) && compDate > now
            ? Math.ceil((compDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        const cert = certsByEmail.get(email);

        return {
          id: d.id,
          docIds: [d.id, ...(studentEnrollments.map((e) => e.id) || [])],
          email: u.email || '',
          displayName: u.displayName || u.name || primaryEnrollment?.studentId || 'Unnamed Student',
          photoURL: u.photoURL || '',
          role: u.role || 'student',
          createdAt: u.createdAt,
          phone: u.phone || '',
          gender: u.gender || primaryEnrollment?.gender || 'Male',
          school: u.school || '',
          collegeName: u.collegeName || primaryEnrollment?.collegeName || '',
          rollNo: u.rollNo || primaryEnrollment?.rollNo || '',
          enrolledCourse: courseTitle,
          assignedCenter: primaryEnrollment?.institute || u.assignedCenter || '',
          batch: primaryEnrollment?.batch || u.batch || '',
          enrolledAtDate: enrolledAtDateStr,
          courseDuration,
          completionDate: completionDateStr,
          isDurationCompleted: isCompleted,
          daysRemaining: daysRem,
          certificateId: cert?.certificateId || cert?.id,
          certificateData: cert,
        };
      });

      setStudents(studentsList);
    } catch (err) {
      console.error('Error fetching students:', err);
      toast.error('Failed to load student records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Checkbox Selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredData.length && filteredData.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map((s) => s.id)));
    }
  };

  // Delete Handlers
  const handleDelete = (
    studentId: string,
    displayName: string,
    docIds?: string[],
    studentEmail?: string,
    enrolledCourse?: string
  ) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Student Record?',
      message: `Are you sure you want to delete ${displayName}? This action removes their student account and related enrollments permanently.`,
      confirmLabel: 'Delete Student',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          batch.delete(doc(db, 'users', studentId));

          if (docIds && docIds.length > 0) {
            docIds.forEach((id) => {
              if (id !== studentId) {
                batch.delete(doc(db, 'enrollments', id));
              }
            });
          }

          if (studentEmail) {
            const enrollSnap = await getDocs(
              query(collection(db, 'enrollments'), where('studentEmail', '==', studentEmail.toLowerCase()))
            );
            enrollSnap.docs.forEach((d) => batch.delete(d.ref));
          }

          await batch.commit();
          toast.success(`Deleted student ${displayName}`);
          await logAdminActivity(
            user?.email,
            'DELETED',
            `Student: ${displayName}`,
            `Enrolled: ${enrolledCourse || 'None'}`
          );
          setStudents((prev) => prev.filter((s) => s.id !== studentId));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(studentId);
            return next;
          });
        } catch (err) {
          console.error('Error deleting student:', err);
          toast.error('Failed to delete student');
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;

    setConfirmModal({
      isOpen: true,
      title: `Delete ${count} Students?`,
      message: `Are you sure you want to permanently delete ${count} selected student(s) and their enrollment records?`,
      confirmLabel: `Delete ${count} Students`,
      variant: 'danger',
      onConfirm: async () => {
        const toastId = toast.loading(`Deleting ${count} students...`);
        try {
          const batch = writeBatch(db);
          const selectedList = students.filter((s) => selectedIds.has(s.id));

          for (const s of selectedList) {
            batch.delete(doc(db, 'users', s.id));
            if (s.docIds) {
              s.docIds.forEach((id) => {
                if (id !== s.id) batch.delete(doc(db, 'enrollments', id));
              });
            }
          }

          await batch.commit();
          toast.success(`Successfully deleted ${count} students`, { id: toastId });
          await logAdminActivity(user?.email, 'BULK_DELETED', `${count} Students`);
          fetchAll();
          setSelectedIds(new Set());
        } catch (err) {
          console.error('Error in bulk delete:', err);
          toast.error('Failed to delete selected students', { id: toastId });
        }
      },
    });
  };

  // Bulk Batch and Center update handlers
  const handleBulkBatchChange = async (batchName: string) => {
    if (!batchName || selectedIds.size === 0) return;
    const toastId = toast.loading(`Assigning batch ${batchName}...`);
    try {
      const batch = writeBatch(db);
      const selectedList = students.filter((s) => selectedIds.has(s.id));

      for (const s of selectedList) {
        batch.update(doc(db, 'users', s.id), { batch: batchName });
        if (s.docIds) {
          s.docIds.forEach((id) => {
            if (id !== s.id) batch.update(doc(db, 'enrollments', id), { batch: batchName });
          });
        }
      }

      await batch.commit();
      toast.success(`Assigned batch to ${selectedIds.size} students`, { id: toastId });
      await logAdminActivity(user?.email, 'UPDATED', `Bulk assigned batch ${batchName} to ${selectedIds.size} students`);
      fetchAll();
      setBulkBatch('');
    } catch (err) {
      console.error('Error updating batch:', err);
      toast.error('Failed to update batch', { id: toastId });
    }
  };

  const handleBulkCenterChange = async (centerId: string) => {
    if (!centerId || selectedIds.size === 0) return;
    const centerObj = centers.find((c) => c.id === centerId);
    const centerName = centerObj?.name || centerId;

    const toastId = toast.loading(`Assigning center ${centerName}...`);
    try {
      const batch = writeBatch(db);
      const selectedList = students.filter((s) => selectedIds.has(s.id));

      for (const s of selectedList) {
        batch.update(doc(db, 'users', s.id), { assignedCenter: centerName });
        if (s.docIds) {
          s.docIds.forEach((id) => {
            if (id !== s.id) batch.update(doc(db, 'enrollments', id), { institute: centerName });
          });
        }
      }

      await batch.commit();
      toast.success(`Assigned center to ${selectedIds.size} students`, { id: toastId });
      await logAdminActivity(user?.email, 'UPDATED', `Bulk assigned center ${centerName} to ${selectedIds.size} students`);
      fetchAll();
      setBulkCenter('');
    } catch (err) {
      console.error('Error updating center:', err);
      toast.error('Failed to update center', { id: toastId });
    }
  };

  // Certificate Issuance Handlers
  const handleOpenIssueModal = (student: Student) => {
    if (student.certificateId && student.certificateData) {
      setPreviewCert(student.certificateData);
      setShowCertPreview(true);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const endStr = student.completionDate || todayStr;

    setIssueStudent(student);
    setIssueForm({
      studentName: student.displayName || '',
      studentEmail: student.email || '',
      courseName: student.enrolledCourse || 'Full Stack Development',
      domain: student.enrolledCourse || 'Web Development',
      gender: (student.gender as any) || 'Male',
      startDate: student.enrolledAtDate || todayStr,
      endDate: endStr,
      issueDate: endStr,
      grade: 'A',
      marksPercentage: '92',
    });
    setIssueModalOpen(true);
  };

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueStudent) return;
    setIsIssuing(true);

    try {
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newCertId = `FCAI-${Date.now().toString().slice(-4)}${randomSuffix}`;

      const certPayload = {
        certificateId: newCertId,
        studentName: issueForm.studentName,
        studentEmail: (issueForm.studentEmail || issueStudent.email).toLowerCase().trim(),
        courseName: issueForm.courseName,
        domain: issueForm.domain,
        gender: issueForm.gender,
        startDate: issueForm.startDate,
        endDate: issueForm.endDate,
        issueDate: issueForm.endDate,
        grade: issueForm.grade,
        marksPercentage: issueForm.marksPercentage,
        type: 'course',
        status: 'issued',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'certificates'), certPayload);

      await updateDoc(doc(db, 'users', issueStudent.id), {
        certificateId: newCertId,
        completionDate: issueForm.endDate,
      });

      if (issueStudent.email) {
        await sendNotification({
          userId: issueStudent.id,
          userEmail: issueStudent.email,
          title: 'Course Certificate Issued! 🎓',
          message: `Congratulations! Your official completion certificate for ${issueForm.courseName} is ready to view & download.`,
          type: 'certificate',
          link: '/dashboard/student?tab=certificates',
        });
      }

      await logAdminActivity(
        user?.email,
        'ISSUED',
        `Student: ${issueForm.studentName}`,
        `Certificate ID: ${newCertId} | Course: ${issueForm.courseName}`
      );

      toast.success(`Official Certificate ${newCertId} Issued!`);
      setIssueModalOpen(false);

      setPreviewCert({ id: docRef.id, ...certPayload } as any);
      setShowCertPreview(true);

      fetchAll();
    } catch (err) {
      console.error('Error issuing certificate:', err);
      toast.error('Failed to issue certificate');
    } finally {
      setIsIssuing(false);
    }
  };

  const handleBulkCertificate = async () => {
    const eligible = selectedStudents.filter((s) => !s.certificateId && s.isDurationCompleted);
    if (eligible.length === 0) {
      toast.error('No selected students are eligible for certificates.');
      return;
    }

    const toastId = toast.loading(`Issuing certificates for ${eligible.length} students...`);
    try {
      const batch = writeBatch(db);
      for (const s of eligible) {
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const certId = `FCAI-${Date.now().toString().slice(-4)}${randomSuffix}`;
        const newDocRef = doc(collection(db, 'certificates'));

        batch.set(newDocRef, {
          certificateId: certId,
          studentName: s.displayName,
          studentEmail: s.email.toLowerCase().trim(),
          courseName: s.enrolledCourse || 'Full Stack Development',
          domain: s.enrolledCourse || 'Web Development',
          gender: s.gender || 'Male',
          startDate: s.enrolledAtDate || new Date().toISOString().split('T')[0],
          endDate: s.completionDate || new Date().toISOString().split('T')[0],
          issueDate: s.completionDate || new Date().toISOString().split('T')[0],
          grade: 'A',
          marksPercentage: '90',
          type: 'course',
          status: 'issued',
          createdAt: serverTimestamp(),
        });

        batch.update(doc(db, 'users', s.id), { certificateId: certId });
      }

      await batch.commit();
      toast.success(`Issued ${eligible.length} certificates successfully!`, { id: toastId });
      await logAdminActivity(user?.email, 'BULK_ISSUED', `${eligible.length} Certificates Generated`);
      fetchAll();
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Error bulk issuing certificates:', err);
      toast.error('Failed to issue bulk certificates', { id: toastId });
    }
  };

  // CSV Export & Import Handlers
  const handleExportCSV = (selectedOnly = false) => {
    const listToExport = selectedOnly && selectedIds.size > 0 ? students.filter((s) => selectedIds.has(s.id)) : students;

    if (listToExport.length === 0) {
      toast.error('No students to export.');
      return;
    }

    const data = listToExport.map((s) => ({
      Name: s.displayName || '',
      Email: s.email || '',
      Phone: s.phone || '',
      Gender: s.gender || '',
      College: s.collegeName || '',
      RollNo: s.rollNo || '',
      Course: s.enrolledCourse || '',
      Center: s.assignedCenter || '',
      Batch: s.batch || '',
      EnrolledDate: s.enrolledAtDate || '',
      Duration: s.courseDuration || '',
      CompletionDate: s.completionDate || '',
      DurationStatus: s.isDurationCompleted ? 'Completed' : `In Progress (${s.daysRemaining}d left)`,
      CertificateStatus: s.certificateId ? 'Issued' : 'Pending',
      CertificateID: s.certificateId || '',
    }));

    exportCSV(`futurecode_students_${new Date().toISOString().split('T')[0]}.csv`, data);
  };

  const downloadSampleStudentCsv = () => {
    const headers = ['Name', 'Email', 'Phone', 'Gender', 'College', 'RollNo', 'Course', 'Center', 'Batch'];
    const sampleRows = [
      ['Aman Kumar', 'aman@example.com', '9876543210', 'Male', 'IIT Patna', '21CS001', 'Full Stack Web Dev', 'FutureCodeAI (Online)', 'Oct 2026'],
      ['Priya Sharma', 'priya@example.com', '9876543211', 'Female', 'NIT Patna', '21EC042', 'AI & Machine Learning', 'Patna Center', 'Nov 2026'],
    ];
    downloadTemplateCSV('student_import_template.csv', headers, sampleRows);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Reading student CSV...');
    parseCSV(
      file,
      async (rows) => {
        try {
          let importedCount = 0;
          const batch = writeBatch(db);

          for (const row of rows) {
            const name = resolveHeaderValue(row, ['name', 'studentname', 'fullname']);
            const email = resolveHeaderValue(row, ['email', 'studentemail', 'mail']);
            const phone = resolveHeaderValue(row, ['phone', 'contact', 'mobile']);
            const gender = resolveHeaderValue(row, ['gender', 'sex']) || 'Male';
            const college = resolveHeaderValue(row, ['college', 'collegename', 'institute']);
            const rollNo = resolveHeaderValue(row, ['roll', 'rollno', 'registrationno']);
            const course = resolveHeaderValue(row, ['course', 'program', 'courseName']);
            const center = resolveHeaderValue(row, ['center', 'assignedcenter', 'branch']);
            const batchVal = resolveHeaderValue(row, ['batch', 'cohort']);

            if (!email && !name) continue;

            const cleanEmail = (email || `${name.toLowerCase().replace(/\s+/g, '')}@student.local`).toLowerCase().trim();
            const userRef = doc(collection(db, 'users'));

            batch.set(
              userRef,
              {
                displayName: name || 'Student',
                email: cleanEmail,
                phone: phone || '',
                gender: gender.toLowerCase() === 'female' ? 'Female' : 'Male',
                collegeName: college || '',
                rollNo: rollNo || '',
                enrolledCourse: course || '',
                assignedCenter: center || '',
                batch: batchVal || '',
                role: 'student',
                createdAt: serverTimestamp(),
              },
              { merge: true }
            );

            if (course || center) {
              const enrollRef = doc(collection(db, 'enrollments'));
              batch.set(enrollRef, {
                studentId: userRef.id,
                studentEmail: cleanEmail,
                studentName: name || 'Student',
                courseName: course || 'General Curriculum',
                institute: center || 'FutureCodeAI',
                batch: batchVal || 'Standard',
                gender: gender.toLowerCase() === 'female' ? 'Female' : 'Male',
                collegeName: college || '',
                rollNo: rollNo || '',
                status: 'enrolled',
                enrolledAt: serverTimestamp(),
                createdAt: serverTimestamp(),
              });
            }

            importedCount++;
          }

          await batch.commit();
          toast.success(`Imported ${importedCount} students successfully!`, { id: toastId });
          await logAdminActivity(user?.email, 'CREATED', `CSV Import: ${importedCount} Students`);
          fetchAll();
        } catch (err) {
          console.error('Error importing CSV:', err);
          toast.error('Failed to import CSV file.', { id: toastId });
        } finally {
          if (csvRef.current) csvRef.current.value = '';
        }
      },
      (err) => {
        toast.error(`CSV Parsing error: ${err.message}`, { id: toastId });
        if (csvRef.current) csvRef.current.value = '';
      }
    );
  };

  // Filtered Students List
  const filteredData = useMemo(() => {
    return students.filter((s) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        (s.displayName || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.rollNo || '').toLowerCase().includes(q) ||
        (s.enrolledCourse || '').toLowerCase().includes(q) ||
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
  const selectedStudents = useMemo(() => students.filter((s) => selectedIds.has(s.id)), [students, selectedIds]);
  const selectedEligibleForCert = useMemo(
    () => selectedStudents.filter((s) => !s.certificateId && s.isDurationCompleted),
    [selectedStudents]
  );
  const selectedInProgress = useMemo(
    () => selectedStudents.filter((s) => !s.certificateId && !s.isDurationCompleted),
    [selectedStudents]
  );
  const selectedWithCert = useMemo(() => selectedStudents.filter((s) => s.certificateId), [selectedStudents]);

  // Unique metadata for filters & metrics
  const uniqueCourses = useMemo(
    () => [...new Set(students.map((s) => s.enrolledCourse).filter((c): c is string => Boolean(c)))],
    [students]
  );
  const uniqueCenters = useMemo(
    () => [...new Set(students.map((s) => s.assignedCenter).filter((c): c is string => Boolean(c)))],
    [students]
  );
  const uniqueBatches = useMemo(
    () => [...new Set(students.map((s) => s.batch).filter((b): b is string => Boolean(b)))],
    [students]
  );

  // KPI Metrics
  const totalCount = students.length;
  const certifiedCount = students.filter((s) => s.certificateId).length;
  const completedUncertifiedCount = students.filter((s) => !s.certificateId && s.isDurationCompleted).length;
  const inProgressCount = students.filter((s) => !s.certificateId && !s.isDurationCompleted).length;
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> Enroll Student
          </button>
          <button
            onClick={() => setShowFormatGuide(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="View Student CSV Format"
          >
            <HelpCircle size={16} className="text-indigo-600" />
            <span className="hidden sm:inline">CSV Format</span>
          </button>
          <button
            onClick={() => handleExportCSV(false)}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => csvRef.current?.click()}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
            title="Import Students from CSV"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Import CSV</span>
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
              {completedUncertifiedCount > 0
                ? `${completedUncertifiedCount} ready to issue`
                : `${Math.round((certifiedCount / (totalCount || 1)) * 100)}% Issued`}
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
            <span className="text-[11px] text-slate-500 font-medium">{inProgressCount} in progress</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <StudentFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterCourse={filterCourse}
          setFilterCourse={setFilterCourse}
          filterCenter={filterCenter}
          setFilterCenter={setFilterCenter}
          filterBatch={filterBatch}
          setFilterBatch={setFilterBatch}
          filterGender={filterGender}
          setFilterGender={setFilterGender}
          filterCertStatus={filterCertStatus}
          setFilterCertStatus={setFilterCertStatus}
          courseOptions={uniqueCourses}
          centerOptions={uniqueCenters}
          batchOptions={uniqueBatches}
          totalCount={totalCount}
          certifiedCount={certifiedCount}
          completedUncertifiedCount={completedUncertifiedCount}
          inProgressCount={inProgressCount}
          filteredCount={filteredData.length}
          onClearFilters={() => {
            setFilterCourse('');
            setFilterCenter('');
            setFilterBatch('');
            setFilterGender('all');
            setFilterCertStatus('all');
          }}
        />

        <StudentTable
          students={filteredData}
          loading={loading}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleAll}
          isAllSelected={selectedIds.size === filteredData.length && filteredData.length > 0}
          onOpenIssueModal={handleOpenIssueModal}
          onViewProfile={(student) => {
            setSelectedStudent(student);
            setIsProfileOpen(true);
          }}
          onEditStudent={(student) => {
            setSelectedStudent(student);
            setIsEditOpen(true);
          }}
          onDeleteStudent={(student) =>
            handleDelete(student.id, student.displayName || 'student', student.docIds, student.email, student.enrolledCourse)
          }
        />
      </div>

      {/* Floating Bulk Actions Bar */}
      <StudentBulkActionsBar
        selectedCount={selectedIds.size}
        selectedWithCert={selectedWithCert}
        selectedEligibleForCert={selectedEligibleForCert}
        selectedInProgress={selectedInProgress}
        selectedStudents={selectedStudents}
        onBulkCertificate={handleBulkCertificate}
        onPreviewSingleCert={(certData) => {
          setPreviewCert(certData);
          setShowCertPreview(true);
        }}
        onExportCSV={handleExportCSV}
        bulkBatch={bulkBatch}
        setBulkBatch={setBulkBatch}
        onBulkBatchChange={handleBulkBatchChange}
        batchOptions={batchOptions}
        bulkCenter={bulkCenter}
        setBulkCenter={setBulkCenter}
        onBulkCenterChange={handleBulkCenterChange}
        centers={centers}
        onBulkDelete={handleBulkDelete}
        onDeselectAll={() => setSelectedIds(new Set())}
      />

      {/* Issue Certificate Modal */}
      <IssueCertificateModal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        student={issueStudent}
        issueForm={issueForm}
        setIssueForm={setIssueForm}
        onSubmit={handleSubmitIssue}
        isIssuing={isIssuing}
        courses={courses}
      />

      {/* Certificate Preview Modal */}
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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
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
          logAdminActivity(
            user?.email,
            'UPDATED',
            `Student Profile: ${selectedStudent?.displayName || selectedStudent?.email}`
          );
        }}
        student={selectedStudent}
      />

      {/* Student CSV Guide Modal */}
      <StudentCsvGuideModal
        isOpen={showFormatGuide}
        onClose={() => setShowFormatGuide(false)}
        onDownloadSample={downloadSampleStudentCsv}
      />
    </div>
  );
}
