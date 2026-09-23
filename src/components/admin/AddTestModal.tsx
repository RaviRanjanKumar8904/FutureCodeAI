import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, doc, updateDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { X, ClipboardCheck, Clock, Hash, Target, Calendar, BookOpen, FileText, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function AddTestModal({ isOpen, onClose, onSuccess, initialData }: AddTestModalProps) {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'mcq' as 'mcq' | 'coding' | 'mixed',
    durationMinutes: 30,
    passPercentage: 40,
    maxAttempts: 1,
    courseId: '',
    courseName: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });

  useEffect(() => {
    if (!isOpen) return;

    const fetchCourses = async () => {
      try {
        const coursesSnap = await getDocs(query(collection(db, 'courses'), orderBy('title')));
        const coursesData = coursesSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((c: any) => c.isActive);
        setCourses(coursesData);
      } catch (err) {
        console.error("Error loading courses for test modal:", err);
      }
    };
    fetchCourses();

    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        type: initialData.type || 'mcq',
        durationMinutes: initialData.durationMinutes || 30,
        passPercentage: initialData.passPercentage || 40,
        maxAttempts: initialData.maxAttempts ?? 1,
        courseId: initialData.courseId || '',
        courseName: initialData.courseName || '',
        startDate: initialData.startDate || '',
        endDate: initialData.endDate || '',
        isActive: initialData.isActive ?? true,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'mcq',
        durationMinutes: 30,
        passPercentage: 40,
        maxAttempts: 1,
        courseId: '',
        courseName: '',
        startDate: '',
        endDate: '',
        isActive: true,
      });
    }
  }, [isOpen, initialData]);

  const handleCourseChange = (courseId: string) => {
    const selected = courses.find(c => c.id === courseId);
    setFormData({
      ...formData,
      courseId,
      courseName: selected ? (selected.title || selected.courseName || '') : '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const testData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        durationMinutes: Number(formData.durationMinutes),
        passPercentage: Number(formData.passPercentage),
        maxAttempts: Number(formData.maxAttempts),
        courseId: formData.courseId,
        courseName: formData.courseName,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        isActive: formData.isActive,
        updatedAt: serverTimestamp(),
      };

      if (initialData?.id) {
        await updateDoc(doc(db, 'tests', initialData.id), testData);
        toast.success('Test updated successfully!');
      } else {
        await addDoc(collection(db, 'tests'), {
          ...testData,
          totalMarks: 0,
          questionsCount: 0,
          createdAt: serverTimestamp(),
        });
        toast.success('Test created successfully!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving test:", error);
      toast.error('Failed to save test');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center overflow-y-auto z-[1100]">
      <div 
        className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative my-auto flex flex-col max-h-[92dvh] border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {initialData ? 'Edit Test' : 'Create New Test'}
            </h2>
            <p className="text-slate-500 font-medium text-xs">Configure test details, type, duration, and assignment.</p>
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
          <form id="testForm" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <ClipboardCheck size={14} className="text-purple-500"/> Test Title <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-base sm:text-sm"
                  placeholder="e.g. JavaScript Fundamentals Quiz"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Layers size={14} className="text-purple-500"/> Test Type <span className="text-rose-500">*</span>
                </label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value as any})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-base sm:text-sm bg-white"
                >
                  <option value="mcq">MCQ Only</option>
                  <option value="coding">Coding Only</option>
                  <option value="mixed">Mixed (MCQ + Coding)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock size={14} className="text-purple-500"/> Duration (minutes) <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="number" 
                  required
                  min={1}
                  value={formData.durationMinutes}
                  onChange={e => setFormData({...formData, durationMinutes: Number(e.target.value)})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-base sm:text-sm"
                  placeholder="e.g. 30"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Target size={14} className="text-purple-500"/> Pass Percentage (%)
                </label>
                <input 
                  type="number" 
                  min={0} max={100}
                  value={formData.passPercentage}
                  onChange={e => setFormData({...formData, passPercentage: Number(e.target.value)})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-base sm:text-sm"
                  placeholder="e.g. 40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Hash size={14} className="text-purple-500"/> Max Attempts
                </label>
                <input 
                  type="number" 
                  min={0}
                  value={formData.maxAttempts}
                  onChange={e => setFormData({...formData, maxAttempts: Number(e.target.value)})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-base sm:text-sm"
                  placeholder="0 = unlimited"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Set 0 for unlimited attempts</p>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-purple-500"/> Assign to Course <span className="text-xs font-normal text-slate-400">(Optional)</span>
                </label>
                <select 
                  value={formData.courseId}
                  onChange={e => handleCourseChange(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-base sm:text-sm bg-white"
                >
                  <option value="">All Courses (Open to all students)</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title || course.courseName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Availability Window */}
            <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100">
              <h3 className="text-purple-900 font-bold mb-3 flex items-center gap-1.5 text-xs sm:text-sm">
                <Calendar size={16} /> Availability Window (Optional)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-purple-900/70 mb-1">Start Date & Time</label>
                  <input 
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-purple-900/70 mb-1">End Date & Time</label>
                  <input 
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-base sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText size={14} className="text-purple-500"/> Description
              </label>
              <textarea 
                rows={3}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium resize-none text-base sm:text-sm"
                placeholder="Brief description of this test..."
              />
            </div>

            <div className="flex items-center gap-2 bg-amber-50/80 p-3 rounded-xl border border-amber-100">
              <input 
                type="checkbox"
                id="isActiveTest"
                checked={formData.isActive}
                onChange={e => setFormData({...formData, isActive: e.target.checked})}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="isActiveTest" className="text-xs font-bold text-amber-900 cursor-pointer">
                Publish this test (make it visible to students)
              </label>
            </div>

          </form>
        </div>

        {/* Sticky Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-xs sm:text-sm cursor-pointer flex items-center justify-center"
          >
            Cancel
          </button>
          <button 
            form="testForm"
            type="submit"
            disabled={loading}
            className="bg-purple-600 text-white px-6 py-2.5 min-h-[44px] rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 disabled:opacity-70 text-xs sm:text-sm cursor-pointer active:scale-95"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              initialData ? 'Save Changes' : 'Create Test'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
