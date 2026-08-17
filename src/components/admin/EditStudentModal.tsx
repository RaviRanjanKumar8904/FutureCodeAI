import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';
import { X, Save, Mail, Phone, BookOpen, Building2, User, School, Hash } from 'lucide-react';
import toast from 'react-hot-toast';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student: any;
}

function generateBatchOptions(): string[] {
  const batches: string[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    batches.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
  }
  return batches;
}

export default function EditStudentModal({ isOpen, onClose, onSuccess, student }: EditStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  
  const batchOptions = useMemo(() => {
    const list = generateBatchOptions();
    if (student?.batch && !list.includes(student.batch)) {
      list.unshift(student.batch);
    }
    return list;
  }, [student?.batch]);

  const [formData, setFormData] = useState({
    studentName: '',
    email: '',
    phone: '',
    gender: 'Male',
    collegeName: '',
    rollNo: '',
    courseId: '',
    courseName: '',
    centerId: '',
    centerName: '',
    batch: '',
  });

  useEffect(() => {
    if (!isOpen || !student) return;

    const fetchData = async () => {
      try {
        const [coursesSnap, centersSnap, enrollSnap] = await Promise.all([
          getDocs(query(collection(db, 'courses'), orderBy('title'))),
          getDocs(query(collection(db, 'collaborators'), orderBy('name'))),
          getDocs(query(collection(db, 'enrollments'), where('studentId', '==', student.id)))
        ]);

        const coursesData = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const centersData = centersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((c: any) => c.isApproved);
        
        setCourses(coursesData);
        setCenters(centersData);

        let currentEnrollment: any = null;
        if (!enrollSnap.empty) {
          currentEnrollment = { id: enrollSnap.docs[0].id, ...enrollSnap.docs[0].data() };
          setEnrollmentId(currentEnrollment.id);
        } else {
          setEnrollmentId(null);
        }

        const centerId = centersData.find((c: any) => c.name === (currentEnrollment?.institute || student.assignedCenter))?.id || '';
        const courseId = coursesData.find((c: any) => c.title === (currentEnrollment?.courseName || student.enrolledCourse))?.id || '';

        setFormData({
          studentName: student.displayName || '',
          email: student.email || '',
          phone: student.phone || '',
          gender: student.gender || currentEnrollment?.gender || 'Male',
          collegeName: student.collegeName || student.school || currentEnrollment?.collegeName || '',
          rollNo: student.rollNo || currentEnrollment?.rollNo || '',
          courseId: courseId,
          courseName: currentEnrollment?.courseName || student.enrolledCourse || '',
          centerId: centerId,
          centerName: currentEnrollment?.institute || student.assignedCenter || '',
          batch: currentEnrollment?.batch || student.batch || batchOptions[0],
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [isOpen, student, batchOptions]);

  const handleCourseChange = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    setFormData(prev => ({
      ...prev,
      courseId,
      courseName: course?.title || course?.courseName || '',
    }));
  };

  const handleCenterChange = (centerId: string) => {
    const center = centers.find(c => c.id === centerId);
    setFormData(prev => ({
      ...prev,
      centerId,
      centerName: center?.name || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName.trim()) {
      toast.error('Student name is required');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Updating student profile...');

    try {
      // 1. Update user document
      await updateDoc(doc(db, 'users', student.id), {
        displayName: formData.studentName.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        school: formData.collegeName.trim(),
        collegeName: formData.collegeName.trim(),
        rollNo: formData.rollNo.trim(),
        enrolledCourse: formData.courseName,
        assignedCenter: formData.centerName || 'FutureCodeAI (Online)',
        batch: formData.batch,
        updatedAt: serverTimestamp(),
      });

      // 2. Update or create enrollment record
      const enrollmentData = {
        studentName: formData.studentName.trim(),
        gender: formData.gender,
        collegeName: formData.collegeName.trim(),
        rollNo: formData.rollNo.trim(),
        phone: formData.phone.trim(),
        courseName: formData.courseName,
        courseId: formData.courseId,
        institute: formData.centerName || 'FutureCodeAI (Online)',
        centerId: formData.centerId,
        batch: formData.batch,
        batchTiming: formData.batch,
        image: courses.find(c => c.id === formData.courseId)?.thumbnailUrl || '',
      };

      if (enrollmentId) {
        await updateDoc(doc(db, 'enrollments', enrollmentId), enrollmentData);
      } else {
        await addDoc(collection(db, 'enrollments'), {
          ...enrollmentData,
          studentId: student.id,
          studentEmail: formData.email,
          status: 'Ongoing',
          enrolledAt: serverTimestamp(),
        });
      }

      toast.success('Student updated successfully!', { id: toastId });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Failed to update student', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center overflow-y-auto z-[1100]">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-auto flex flex-col max-h-[92dvh] border border-gray-100" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <User size={20} className="text-blue-600" /> Edit Student
            </h2>
            <p className="text-xs text-slate-500 font-medium">Update profile, course, or batch assignment</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer active:scale-90"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-none text-xs sm:text-sm">
          <form id="editForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                  <User size={13} className="text-blue-500" /> Name <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  value={formData.studentName} 
                  onChange={e => setFormData({ ...formData, studentName: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-xs sm:text-base text-slate-800" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-xs sm:text-base text-slate-800 cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" /> Email (Permanent)
                </label>
                <input 
                  type="email" 
                  value={formData.email} 
                  disabled
                  className="w-full bg-slate-100 border border-gray-200 rounded-xl px-3.5 py-2.5 text-slate-500 font-medium text-xs sm:text-base cursor-not-allowed" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone size={13} className="text-blue-500" /> Phone Number
                </label>
                <input 
                  type="tel" 
                  value={formData.phone} 
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-xs sm:text-base text-slate-800" 
                />
              </div>
            </div>

            {/* Academic Info: College & Reg/Roll No */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/60">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                  <School size={13} className="text-blue-500" /> College / Institute Name
                </label>
                <input
                  type="text"
                  value={formData.collegeName}
                  onChange={e => setFormData({ ...formData, collegeName: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-xs sm:text-base text-slate-800"
                  placeholder="e.g. Purnea College"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                  <Hash size={13} className="text-blue-500" /> Reg / Roll Number
                </label>
                <input
                  type="text"
                  value={formData.rollNo}
                  onChange={e => setFormData({ ...formData, rollNo: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-xs sm:text-base text-slate-800"
                  placeholder="e.g. 21CS042"
                />
              </div>
            </div>

            <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 space-y-3">
              <h3 className="text-blue-900 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <BookOpen size={15} /> Course &amp; Batch Assignment
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-blue-900/70 mb-1">Course</label>
                  <select 
                    value={formData.courseId} 
                    onChange={e => handleCourseChange(e.target.value)}
                    className="w-full bg-white border border-blue-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-xs sm:text-base"
                  >
                    <option value="">No Course Assigned</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-blue-900/70 mb-1">Batch</label>
                  <select 
                    value={formData.batch} 
                    onChange={e => setFormData({ ...formData, batch: e.target.value })}
                    className="w-full bg-white border border-blue-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-xs sm:text-base"
                  >
                    <option value="">No Batch Assigned</option>
                    {batchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 size={13} className="text-blue-500" /> Coaching Center
              </label>
              <select 
                value={formData.centerId} 
                onChange={e => handleCenterChange(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-xs sm:text-base text-slate-800"
              >
                <option value="">FutureCodeAI (Online)</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.city || 'N/A'}</option>)}
              </select>
            </div>
          </form>
        </div>

        {/* Sticky Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-100 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-xs sm:text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button 
            form="editForm" 
            type="submit" 
            disabled={loading} 
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-70 text-xs sm:text-sm cursor-pointer active:scale-95"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={15} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}
