import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { X, UserPlus, Mail, Phone, BookOpen, Building2, User, Hash, School } from 'lucide-react';
import toast from 'react-hot-toast';

interface EnrollStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    studentName?: string;
    email?: string;
    phone?: string;
    gender?: string;
    collegeName?: string;
    rollNo?: string;
    courseName?: string;
    centerName?: string;
  };
}

// Generate the next 6 months as batch options
function generateBatchOptions() {
  const batches: string[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    batches.push(label);
  }
  return batches;
}

export default function EnrollStudentModal({ isOpen, onClose, onSuccess, initialData }: EnrollStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const batchOptions = useMemo(() => generateBatchOptions(), []);

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
    batch: batchOptions[0] || '',
  });

  // Fetch courses and approved collaborators
  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      try {
        const [coursesSnap, centersSnap] = await Promise.all([
          getDocs(query(collection(db, 'courses'), orderBy('title'))),
          getDocs(query(collection(db, 'collaborators'), orderBy('name'))),
        ]);
        const coursesData = coursesSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((c: any) => c.isActive !== false);
        const centersData = centersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((c: any) => c.isApproved);
        setCourses(coursesData);
        setCenters(centersData);

        // Pre-fill courseId and centerId if initialData has matching names
        let matchedCourseId = '';
        let matchedCourseName = initialData?.courseName || '';
        if (matchedCourseName) {
          const found = coursesData.find((c: any) => c.title?.toLowerCase() === matchedCourseName.toLowerCase());
          if (found) {
            matchedCourseId = found.id;
            matchedCourseName = (found as any).title;
          }
        }

        let matchedCenterId = '';
        let matchedCenterName = initialData?.centerName || '';
        if (matchedCenterName) {
          const found = centersData.find((c: any) => c.name?.toLowerCase().includes(matchedCenterName.toLowerCase()) || c.city?.toLowerCase().includes(matchedCenterName.toLowerCase()));
          if (found) {
            matchedCenterId = found.id;
            matchedCenterName = (found as any).name;
          }
        }

        setFormData({
          studentName: initialData?.studentName || '',
          email: initialData?.email || '',
          phone: initialData?.phone || '',
          gender: initialData?.gender || 'Male',
          collegeName: initialData?.collegeName || '',
          rollNo: initialData?.rollNo || '',
          courseId: matchedCourseId || (coursesData[0]?.id || ''),
          courseName: matchedCourseName || (coursesData[0] ? (coursesData[0] as any).title : ''),
          centerId: matchedCenterId,
          centerName: matchedCenterName,
          batch: batchOptions[0] || '',
        });
      } catch (err) {
        console.error('Error loading courses/centers:', err);
      }
    };
    fetchData();
  }, [isOpen, initialData, batchOptions]);

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
    if (!formData.studentName.trim() || !formData.email.trim() || !formData.courseId) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Enrolling student...');

    try {
      const emailLower = formData.email.trim().toLowerCase();
      const matchedCourse = courses.find(c => c.id === formData.courseId);
      const selectedCenter = centers.find(c => c.id === formData.centerId);

      // Check if student user already exists by email
      const userQ = query(collection(db, 'users'), where('email', '==', emailLower));
      const userSnap = await getDocs(userQ);

      let studentUid = '';
      let instituteId = formData.centerId || '';

      if (!userSnap.empty) {
        // User already exists, update their profile fields
        const existingUserDoc = userSnap.docs[0];
        studentUid = existingUserDoc.id;
        
        await updateDoc(doc(db, 'users', studentUid), {
          displayName: formData.studentName.trim(),
          phone: formData.phone.trim() || existingUserDoc.data()?.phone || '',
          gender: formData.gender,
          school: formData.collegeName.trim() || existingUserDoc.data()?.school || '',
          collegeName: formData.collegeName.trim() || existingUserDoc.data()?.collegeName || '',
          rollNo: formData.rollNo.trim() || existingUserDoc.data()?.rollNo || '',
          enrolledCourse: formData.courseName || matchedCourse?.title || '',
          assignedCenter: formData.centerName || 'FutureCodeAI (Online)',
          batch: formData.batch,
        });
      } else {
        // Create user document placeholder for student
        const newUserRef = await addDoc(collection(db, 'users'), {
          displayName: formData.studentName.trim(),
          email: emailLower,
          phone: formData.phone.trim(),
          gender: formData.gender,
          school: formData.collegeName.trim(),
          collegeName: formData.collegeName.trim(),
          rollNo: formData.rollNo.trim(),
          enrolledCourse: formData.courseName || matchedCourse?.title || '',
          assignedCenter: formData.centerName || 'FutureCodeAI (Online)',
          batch: formData.batch,
          role: 'student',
          status: 'active',
          photoURL: '',
          createdAt: serverTimestamp(),
        });
        studentUid = newUserRef.id;
      }

      // Create enrollment document
      await addDoc(collection(db, 'enrollments'), {
        studentId: studentUid,
        studentName: formData.studentName.trim(),
        studentEmail: emailLower,
        phone: formData.phone.trim(),
        gender: formData.gender,
        collegeName: formData.collegeName.trim(),
        rollNo: formData.rollNo.trim(),
        courseName: formData.courseName || matchedCourse?.title || 'Tech Program',
        courseId: formData.courseId || matchedCourse?.id || '',
        institute: formData.centerName || 'FutureCodeAI (Online)',
        centerId: formData.centerId || '',
        instituteId,
        city: selectedCenter?.city || 'Online',
        batch: formData.batch,
        batchTiming: formData.batch,
        status: 'Ongoing',
        image: matchedCourse?.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
        enrolledAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      toast.success('Student enrolled successfully!', { id: toastId });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error enrolling student:', error);
      toast.error('Failed to enroll student', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center overflow-y-auto z-[1100]">
      <div
        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-auto flex flex-col max-h-[92dvh] border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Enroll Student</h2>
              <p className="text-xs text-slate-500 font-medium">Add a student to a course, center, and batch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/80 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer active:scale-90"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 scrollbar-none text-xs sm:text-sm">
            {/* Student Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User size={14} className="text-slate-400" />
                  Student Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.studentName}
                  onChange={e => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
                  placeholder="e.g. Rahul Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail size={14} className="text-slate-400" />
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="e.g. rahul@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Phone & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone size={14} className="text-slate-400" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* College Name & Roll Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <School size={14} className="text-slate-400" />
                  College / School Name
                </label>
                <input
                  type="text"
                  value={formData.collegeName}
                  onChange={e => setFormData(prev => ({ ...prev, collegeName: e.target.value }))}
                  placeholder="e.g. MIT Muzaffarpur"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Hash size={14} className="text-slate-400" />
                  Roll Number / Student ID
                </label>
                <input
                  type="text"
                  value={formData.rollNo}
                  onChange={e => setFormData(prev => ({ ...prev, rollNo: e.target.value }))}
                  placeholder="e.g. 21CS045"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Course Selection */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <BookOpen size={14} className="text-slate-400" />
                Course / Program <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.courseId}
                onChange={e => handleCourseChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              >
                <option value="">Select a course...</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title || course.courseName} {course.duration ? `(${course.duration})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Center & Batch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building2 size={14} className="text-slate-400" />
                  Training Center / Institute
                </label>
                <select
                  value={formData.centerId}
                  onChange={e => handleCenterChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  <option value="">FutureCode AI (Online)</option>
                  {centers.map(center => (
                    <option key={center.id} value={center.id}>
                      {center.name} {center.city ? `(${center.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Batch
                </label>
                <select
                  value={formData.batch}
                  onChange={e => setFormData(prev => ({ ...prev, batch: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  {batchOptions.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sticky Footer Actions */}
          <div className="p-3 sm:p-4 bg-slate-50/90 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs sm:text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enrolling...
                </>
              ) : (
                'Enroll Student'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
