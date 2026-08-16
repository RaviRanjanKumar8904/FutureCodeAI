import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';
import { X, Save, Mail, Phone, BookOpen, Building2, User } from 'lucide-react';
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
    // Ensure the student's current batch is in the options if it's an older batch
    if (student?.batch && !list.includes(student.batch)) {
      list.unshift(student.batch);
    }
    return list;
  }, [student?.batch]);

  const [formData, setFormData] = useState({
    studentName: '',
    email: '',
    phone: '',
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
    setFormData(prev => ({ ...prev, courseId, courseName: course?.title || '' }));
  };

  const handleCenterChange = (centerId: string) => {
    const center = centers.find(c => c.id === centerId);
    setFormData(prev => ({ ...prev, centerId, centerName: center?.name || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName || !formData.email) {
      toast.error('Name and Email are required');
      return;
    }
    
    setLoading(true);
    const toastId = toast.loading('Updating student...');

    try {
      // Update user doc
      await updateDoc(doc(db, 'users', student.id), {
        displayName: formData.studentName,
        phone: formData.phone,
      });

      // Determine linked institute ID from selected center
      const selectedCenter = centers.find(c => c.id === formData.centerId);
      const instituteId = selectedCenter ? (selectedCenter.linkedUserId || selectedCenter.id || '') : '';

      // Update or create enrollment doc
      const enrollmentData = {
        studentName: formData.studentName,
        courseName: formData.courseName,
        courseId: formData.courseId,
        institute: formData.centerName || 'FutureCodeAI (Online)',
        centerId: formData.centerId,
        instituteId,
        city: selectedCenter?.city || 'Online',
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto" style={{ zIndex: 1000 }}>
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-auto flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <User size={24} className="text-blue-600" /> Edit Student
            </h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto">
          <form id="editForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <User size={16} className="text-blue-500" /> Name <span className="text-rose-500">*</span>
                </label>
                <input type="text" required value={formData.studentName} onChange={e => setFormData({ ...formData, studentName: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Mail size={16} className="text-slate-400" /> Email
                </label>
                <input type="email" value={formData.email} disabled
                  className="w-full bg-slate-100 border border-gray-200 rounded-xl px-4 py-3 text-slate-500 font-medium cursor-not-allowed" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Phone size={16} className="text-blue-500" /> Phone Number
              </label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" />
            </div>

            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-blue-900 font-bold mb-4 flex items-center gap-2"><BookOpen size={18} /> Enrollment Details</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-blue-900/70 mb-2">Course</label>
                  <select value={formData.courseId} onChange={e => handleCourseChange(e.target.value)}
                    className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium">
                    <option value="">No Course Assigned</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-blue-900/70 mb-2">Batch</label>
                  <select value={formData.batch} onChange={e => setFormData({ ...formData, batch: e.target.value })}
                    className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium">
                    <option value="">No Batch Assigned</option>
                    {batchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Building2 size={16} className="text-blue-500" /> Coaching Center
              </label>
              <select value={formData.centerId} onChange={e => handleCenterChange(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium">
                <option value="">FutureCodeAI (Online)</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.city || 'N/A'}</option>)}
              </select>
            </div>
          </form>
        </div>

        <div className="p-6 md:p-8 border-t border-gray-100 bg-slate-50 flex items-center justify-end gap-4 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
          <button form="editForm" type="submit" disabled={loading} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-70">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={18} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}
