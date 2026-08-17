import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, doc, updateDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { X, BookOpen, Clock, Tag, Image as ImageIcon, FileText, Layers, IndianRupee, Building2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function AddCourseModal({ isOpen, onClose, onSuccess, initialData }: AddCourseModalProps) {
  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Programming Languages',
    duration: '',
    level: 'Beginner to Advanced',
    originalPrice: 2500,
    discountedPrice: 990,
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
    description: '',
    isTopSelling: false,
    centerId: '',
    batchId: '',
    timing: '6:00 PM - 8:00 PM',
    startDate: '',
    capacity: 50,
  });

  useEffect(() => {
    if (!isOpen) return;

    const fetchCenters = async () => {
      try {
        const centersSnap = await getDocs(query(collection(db, 'collaborators'), orderBy('name')));
        const centersData = centersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((c: any) => c.isApproved);
        setCenters(centersData);
      } catch (err) {
        console.error("Error loading centers for course modal:", err);
      }
    };
    fetchCenters();

    if (initialData) {
      setFormData({
        title: initialData.title || initialData.courseName || '',
        category: initialData.category || 'Programming Languages',
        duration: initialData.duration || '',
        level: initialData.level || 'Beginner to Advanced',
        originalPrice: initialData.originalPrice || 2500,
        discountedPrice: initialData.discountedPrice || 990,
        thumbnailUrl: initialData.thumbnailUrl || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
        description: initialData.description || '',
        isTopSelling: initialData.isTopSelling || false,
        centerId: initialData.centerId || '',
        batchId: initialData.batchId || '',
        timing: initialData.timing || initialData.batchTimings || '6:00 PM - 8:00 PM',
        startDate: initialData.startDate || '',
        capacity: initialData.capacity || initialData.totalSeats || 50,
      });
    } else {
      setFormData({
        title: '',
        category: 'Programming Languages',
        duration: '',
        level: 'Beginner to Advanced',
        originalPrice: 2500,
        discountedPrice: 990,
        thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
        description: '',
        isTopSelling: false,
        centerId: '',
        batchId: '',
        timing: '6:00 PM - 8:00 PM',
        startDate: '',
        capacity: 50,
      });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedCenter = centers.find(c => c.id === formData.centerId);
      const instituteId = selectedCenter ? (selectedCenter.linkedUserId || selectedCenter.id || '') : (initialData?.instituteId || '');
      const institute = selectedCenter ? {
        name: selectedCenter.name,
        city: selectedCenter.city || 'Online',
        address: selectedCenter.address || ''
      } : (initialData?.institute || { name: "FutureCodeAI", city: "Purnea", address: "Online & Offline" });

      const courseData = {
        title: formData.title,
        courseName: formData.title,
        category: formData.category,
        duration: formData.duration,
        level: formData.level,
        originalPrice: Number(formData.originalPrice),
        discountedPrice: Number(formData.discountedPrice),
        thumbnailUrl: formData.thumbnailUrl,
        description: formData.description,
        isTopSelling: formData.isTopSelling,
        centerId: formData.centerId || '',
        instituteId,
        institute,
        batchTimings: formData.timing,
        startDate: formData.startDate,
        totalSeats: Number(formData.capacity),
      };

      if (initialData?.id) {
        await updateDoc(doc(db, 'courses', initialData.id), courseData);
        toast.success('Course updated successfully!');
      } else {
        const newCourse = {
          ...courseData,
          isActive: true,
          studentsCount: 0,
          filledSeats: 0,
          filled: 0,
          status: 'Active',
          syllabus: [{ title: 'Module 1: Introduction', topics: ['Course Overview', 'Setup & Installation'] }],
          galleryUrls: [],
        };
        await addDoc(collection(db, 'courses'), newCourse);
        toast.success('Course added successfully!');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving course:", error);
      toast.error('Failed to save course');
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
              {initialData ? 'Edit Course' : 'Add New Course'}
            </h2>
            <p className="text-slate-500 font-medium text-xs">Configure course details, pricing, and center allocation.</p>
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
          <form id="courseForm" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-purple-500"/> Course Title <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-xs sm:text-base"
                  placeholder="e.g. Frontend Development"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Layers size={14} className="text-purple-500"/> Category
                </label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-xs sm:text-base bg-white"
                >
                  <option value="Programming Languages">Programming Languages</option>
                  <option value="Web Development">Web Development</option>
                  <option value="AI/ML">AI/ML</option>
                  <option value="School Curriculum">School Curriculum</option>
                  <option value="Preparation">Preparation</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock size={14} className="text-purple-500"/> Duration <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.duration}
                  onChange={e => setFormData({...formData, duration: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-xs sm:text-base"
                  placeholder="e.g. 6 Months"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Tag size={14} className="text-purple-500"/> Difficulty Level
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.level}
                  onChange={e => setFormData({...formData, level: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-xs sm:text-base"
                  placeholder="e.g. Beginner to Advanced"
                />
              </div>
            </div>

            {/* Center / Institute Assignment */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 size={14} className="text-purple-500"/> Training Center / Partner
              </label>
              <select 
                value={formData.centerId}
                onChange={e => setFormData({...formData, centerId: e.target.value})}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-xs sm:text-base bg-white"
              >
                <option value="">Global / Online (FutureCode AI)</option>
                {centers.map(center => (
                  <option key={center.id} value={center.id}>
                    {center.name} {center.city ? `(${center.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock size={14} className="text-purple-500"/> Batch Timings
                </label>
                <input 
                  type="text" 
                  value={formData.timing}
                  onChange={e => setFormData({...formData, timing: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-xs sm:text-base"
                  placeholder="e.g. 6:00 PM - 8:00 PM"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar size={14} className="text-purple-500"/> Batch Start Date
                </label>
                <input 
                  type="text" 
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-xs sm:text-base"
                  placeholder="e.g. 1st of Every Month"
                />
              </div>
            </div>

            <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100">
              <h3 className="text-purple-900 font-bold mb-3 flex items-center gap-1.5 text-xs sm:text-sm">
                <IndianRupee size={16} /> Pricing (Per Month)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-purple-900/70 mb-1">Original Price (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.originalPrice}
                    onChange={e => setFormData({...formData, originalPrice: e.target.value as any})}
                    className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-xs sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-purple-900/70 mb-1">Discounted Price (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.discountedPrice}
                    onChange={e => setFormData({...formData, discountedPrice: e.target.value as any})}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-emerald-700 text-xs sm:text-base"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-purple-500"/> Thumbnail URL
              </label>
              <input 
                type="url" 
                required
                value={formData.thumbnailUrl}
                onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-xs sm:text-base"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText size={14} className="text-purple-500"/> Description
              </label>
              <textarea 
                required
                rows={3}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium resize-none text-xs sm:text-base"
                placeholder="Brief description of the course..."
              />
            </div>

            <div className="flex items-center gap-2 bg-amber-50/80 p-3 rounded-xl border border-amber-100">
              <input 
                type="checkbox"
                id="isTopSelling"
                checked={formData.isTopSelling}
                onChange={e => setFormData({...formData, isTopSelling: e.target.checked})}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="isTopSelling" className="text-xs font-bold text-amber-900 cursor-pointer">
                Mark as Top Selling / Featured Course
              </label>
            </div>

          </form>
        </div>

        {/* Sticky Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors text-xs sm:text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button 
            form="courseForm"
            type="submit"
            disabled={loading}
            className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-600/20 flex items-center gap-2 disabled:opacity-70 text-xs sm:text-sm cursor-pointer active:scale-95"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              initialData ? 'Save Changes' : 'Add Course'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
