import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { X, UserPlus, Mail, Phone, BookOpen, Building2, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface EnrollStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

export default function EnrollStudentModal({ isOpen, onClose, onSuccess }: EnrollStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const batchOptions = useMemo(() => generateBatchOptions(), []);

  const [formData, setFormData] = useState({
    studentName: '',
    email: '',
    phone: '',
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
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      }
    };
    fetchData();
    // Reset form
    setFormData({
      studentName: '',
      email: '',
      phone: '',
      courseId: '',
      courseName: '',
      centerId: '',
      centerName: '',
      batch: batchOptions[0] || '',
    });
  }, [isOpen, batchOptions]);

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
    if (!formData.studentName || !formData.email || !formData.courseId) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    const toastId = toast.loading('Enrolling student...');

    try {
      // Check if user doc already exists with this email
      const usersQuery = query(collection(db, 'users'), where('email', '==', formData.email));
      const existingUsers = await getDocs(usersQuery);
      let studentId = '';

      if (existingUsers.empty) {
        // Create a placeholder user doc (will merge when student logs in with same email)
        const userRef = await addDoc(collection(db, 'users'), {
          email: formData.email,
          displayName: formData.studentName,
          phone: formData.phone || '',
          photoURL: '',
          role: 'student',
          status: 'active',
          enrolledByAdmin: true,
          createdAt: serverTimestamp(),
        });
        studentId = userRef.id;
      } else {
        studentId = existingUsers.docs[0].id;
      }

      // Determine linked institute ID from selected center
      const selectedCenter = centers.find(c => c.id === formData.centerId);
      const instituteId = selectedCenter ? (selectedCenter.userId || selectedCenter.uid || selectedCenter.id || '') : '';

      // Create enrollment record
      await addDoc(collection(db, 'enrollments'), {
        studentId,
        studentEmail: formData.email,
        studentName: formData.studentName,
        courseName: formData.courseName,
        courseId: formData.courseId,
        institute: formData.centerName || 'FutureCodeAI (Online)',
        centerId: formData.centerId || '',
        instituteId,
        city: selectedCenter?.city || 'Online',
        batch: formData.batch,
        batchTiming: formData.batch,
        status: 'Ongoing',
        image: courses.find(c => c.id === formData.courseId)?.thumbnailUrl || '',
        enrolledAt: serverTimestamp(),
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
        <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <UserPlus size={24} className="text-blue-600" /> Enroll New Student
            </h2>
            <p className="text-slate-500 font-medium text-sm mt-1">Add a student and assign course, center & batch.</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 md:p-8 overflow-y-auto">
          <form id="enrollForm" onSubmit={handleSubmit} className="space-y-6">
            {/* Student Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <User size={16} className="text-blue-500" /> Student Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.studentName}
                  onChange={e => setFormData({ ...formData, studentName: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  placeholder="e.g. Ravi Kumar"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Mail size={16} className="text-blue-500" /> Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  placeholder="student@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Phone size={16} className="text-blue-500" /> Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                placeholder="+91 9876543210"
              />
            </div>

            {/* Course Selection */}
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-blue-900 font-bold mb-4 flex items-center gap-2">
                <BookOpen size={18} /> Course & Enrollment Details
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-blue-900/70 mb-2">Course <span className="text-rose-500">*</span></label>
                  <select
                    required
                    value={formData.courseId}
                    onChange={e => handleCourseChange(e.target.value)}
                    className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  >
                    <option value="">Select a course...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-blue-900/70 mb-2">Batch</label>
                  <select
                    value={formData.batch}
                    onChange={e => setFormData({ ...formData, batch: e.target.value })}
                    className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  >
                    {batchOptions.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Center Assignment */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Building2 size={16} className="text-blue-500" /> Coaching Center (Optional)
              </label>
              <select
                value={formData.centerId}
                onChange={e => handleCenterChange(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              >
                <option value="">FutureCodeAI (Online — No Center)</option>
                {centers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.city || 'N/A'}</option>
                ))}
              </select>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 border-t border-gray-100 bg-slate-50 flex items-center justify-end gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            form="enrollForm"
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus size={18} /> Enroll Student
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
