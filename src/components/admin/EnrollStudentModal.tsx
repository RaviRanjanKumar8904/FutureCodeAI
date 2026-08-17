import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, updateDoc, setDoc } from 'firebase/firestore';
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
          courseId: matchedCourseId,
          courseName: matchedCourseName,
          centerId: matchedCenterId,
          centerName: matchedCenterName,
          batch: batchOptions[0] || '',
        });
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      }
    };
    fetchData();
  }, [isOpen, batchOptions, initialData]);

  const handleCourseChange = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    setFormData(prev => ({
      ...prev,
      courseId,
      courseName: course?.title || '',
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
    if (!formData.studentName.trim() || !formData.email.trim() || !formData.courseName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    const toastId = toast.loading('Enrolling student...');

    try {
      const cleanEmail = formData.email.toLowerCase().trim();
      const cleanName = formData.studentName.trim();

      // Check if user doc already exists with this email
      const usersQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const existingUsers = await getDocs(usersQuery);
      let studentId = '';

      if (existingUsers.empty) {
        // Create user doc
        const userRef = await addDoc(collection(db, 'users'), {
          email: cleanEmail,
          displayName: cleanName,
          phone: formData.phone || '',
          gender: formData.gender || 'Male',
          school: formData.collegeName || '',
          collegeName: formData.collegeName || '',
          rollNo: formData.rollNo || '',
          enrolledCourse: formData.courseName,
          assignedCenter: formData.centerName || 'FutureCodeAI (Online)',
          batch: formData.batch,
          photoURL: '',
          role: 'student',
          status: 'active',
          enrolledByAdmin: true,
          createdAt: serverTimestamp(),
        });
        studentId = userRef.id;
      } else {
        studentId = existingUsers.docs[0].id;
        // Update user profile with gender/college/rollNo/enrolledCourse
        await updateDoc(doc(db, 'users', studentId), {
          displayName: cleanName,
          gender: formData.gender || 'Male',
          school: formData.collegeName || '',
          collegeName: formData.collegeName || '',
          rollNo: formData.rollNo || '',
          phone: formData.phone || '',
          enrolledCourse: formData.courseName,
          assignedCenter: formData.centerName || 'FutureCodeAI (Online)',
          batch: formData.batch,
        });
      }

      // Determine linked institute ID from selected center
      const selectedCenter = centers.find(c => c.id === formData.centerId);
      const instituteId = selectedCenter ? (selectedCenter.linkedUserId || selectedCenter.id || '') : '';
      const matchedCourse = courses.find(c => c.id === formData.courseId || c.title?.toLowerCase() === formData.courseName.toLowerCase());

      // Create enrollment record
      await addDoc(collection(db, 'enrollments'), {
        studentId,
        studentEmail: cleanEmail,
        studentName: cleanName,
        gender: formData.gender || 'Male',
        collegeName: formData.collegeName || '',
        rollNo: formData.rollNo || '',
        courseName: formData.courseName,
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto" style={{ zIndex: 1000 }}>
      <div
        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-auto flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Enroll Student</h2>
              <p className="text-xs text-slate-500 font-medium">Add a student to a course, center, and batch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Student Name & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-slate-400" />
                Student Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.studentName}
                onChange={e => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
                placeholder="e.g. Rahul Kumar"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail size={14} className="text-slate-400" />
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. rahul@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Phone & Gender */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone size={14} className="text-slate-400" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="e.g. +91 9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.gender}
                onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* College Name & Roll Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <School size={14} className="text-slate-400" />
                College / School Name
              </label>
              <input
                type="text"
                value={formData.collegeName}
                onChange={e => setFormData(prev => ({ ...prev, collegeName: e.target.value }))}
                placeholder="e.g. MIT Muzaffarpur"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Hash size={14} className="text-slate-400" />
                Roll Number / Student ID
              </label>
              <input
                type="text"
                value={formData.rollNo}
                onChange={e => setFormData(prev => ({ ...prev, rollNo: e.target.value }))}
                placeholder="e.g. 21CS045"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Course Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <BookOpen size={14} className="text-slate-400" />
              Course / Program <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.courseId}
              onChange={e => handleCourseChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building2 size={14} className="text-slate-400" />
                Training Center / Institute
              </label>
              <select
                value={formData.centerId}
                onChange={e => handleCenterChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Batch
              </label>
              <select
                value={formData.batch}
                onChange={e => setFormData(prev => ({ ...prev, batch: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              >
                {batchOptions.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
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
