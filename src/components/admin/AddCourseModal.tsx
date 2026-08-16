import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, doc, updateDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { X, BookOpen, Clock, Tag, Image as ImageIcon, FileText, Layers, IndianRupee, Building2, Calendar, Users } from 'lucide-react';
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
      const instituteId = selectedCenter ? (selectedCenter.userId || selectedCenter.uid || selectedCenter.id || '') : (initialData?.instituteId || '');
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
        instituteId: instituteId || '',
        institute,
        batchId: formData.batchId || (formData.title ? `${formData.title.substring(0, 3).toUpperCase()}-101` : 'BATCH-101'),
        timing: formData.timing || 'Flexible',
        batchTimings: formData.timing || 'Flexible',
        startDate: formData.startDate || 'Immediate',
        capacity: Number(formData.capacity) || 50,
        totalSeats: Number(formData.capacity) || 50,
      };

      if (initialData?.id) {
        // Edit existing course
        await updateDoc(doc(db, 'courses', initialData.id), courseData);
        toast.success('Course updated successfully!');
      } else {
        // Add new course
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto" style={{ zIndex: 1000 }}>
      <div 
        className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative my-auto flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              {initialData ? 'Edit Course' : 'Add New Course'}
            </h2>
            <p className="text-slate-500 font-medium text-sm mt-1">Configure course details and pricing.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto">
          <form id="courseForm" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <BookOpen size={16} className="text-purple-500"/> Course Title
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                  placeholder="e.g. Frontend Development"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Layers size={16} className="text-purple-500"/> Category
                </label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                >
                  <option value="Programming Languages">Programming Languages</option>
                  <option value="Web Development">Web Development</option>
                  <option value="AI/ML">AI/ML</option>
                  <option value="School Curriculum">School Curriculum</option>
                  <option value="Preparation">Preparation</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Clock size={16} className="text-purple-500"/> Duration
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.duration}
                  onChange={e => setFormData({...formData, duration: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                  placeholder="e.g. 6 Months"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Tag size={16} className="text-purple-500"/> Difficulty Level
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.level}
                  onChange={e => setFormData({...formData, level: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                  placeholder="e.g. Beginner to Advanced"
                />
              </div>
            </div>

            {/* Center / Institute Assignment */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Building2 size={16} className="text-purple-500"/> Assigned Partner Institute / Coaching Center (Optional)
              </label>
              <select 
                value={formData.centerId}
                onChange={e => setFormData({...formData, centerId: e.target.value})}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
              >
                <option value="">FutureCodeAI Main (Global / Online)</option>
                {centers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.city || 'N/A'}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch & Schedule Details */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100 space-y-4">
              <h3 className="text-slate-800 font-bold flex items-center gap-2">
                <Calendar size={18} className="text-purple-500" /> Batch & Capacity Settings
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Batch Code / ID</label>
                  <input 
                    type="text" 
                    value={formData.batchId}
                    onChange={e => setFormData({...formData, batchId: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-sm"
                    placeholder="e.g. FSD-2026-A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Batch Timing</label>
                  <input 
                    type="text" 
                    value={formData.timing}
                    onChange={e => setFormData({...formData, timing: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-sm"
                    placeholder="e.g. 6:00 PM - 8:00 PM"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Total Capacity</label>
                  <input 
                    type="number" 
                    value={formData.capacity}
                    onChange={e => setFormData({...formData, capacity: Number(e.target.value)})}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
              <h3 className="text-purple-900 font-bold mb-4 flex items-center gap-2">
                <IndianRupee size={18} /> Pricing (Per Month)
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-purple-900/70 mb-2">Original Price</label>
                  <div className="relative">
                    <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="number" 
                      required
                      value={formData.originalPrice}
                      onChange={e => setFormData({...formData, originalPrice: e.target.value as any})}
                      className="w-full bg-white border border-purple-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-purple-900/70 mb-2">Discounted Price</label>
                  <div className="relative">
                    <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                    <input 
                      type="number" 
                      required
                      value={formData.discountedPrice}
                      onChange={e => setFormData({...formData, discountedPrice: e.target.value as any})}
                      className="w-full bg-white border border-emerald-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-emerald-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <ImageIcon size={16} className="text-purple-500"/> Thumbnail URL
              </label>
              <input 
                type="url" 
                required
                value={formData.thumbnailUrl}
                onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <FileText size={16} className="text-purple-500"/> Description
              </label>
              <textarea 
                required
                rows={4}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium resize-none"
                placeholder="Brief description of the course..."
              />
            </div>

            <div className="flex items-center gap-2 bg-amber-50 p-4 rounded-xl border border-amber-100">
              <input 
                type="checkbox"
                id="isTopSelling"
                checked={formData.isTopSelling}
                onChange={e => setFormData({...formData, isTopSelling: e.target.checked})}
                className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="isTopSelling" className="text-sm font-bold text-amber-900 cursor-pointer">
                Mark as Top Selling
              </label>
            </div>

          </form>
        </div>

        <div className="p-6 md:p-8 border-t border-gray-100 bg-slate-50 flex items-center justify-end gap-4 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            form="courseForm"
            type="submit"
            disabled={loading}
            className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              initialData ? 'Save Changes' : 'Add Course'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
