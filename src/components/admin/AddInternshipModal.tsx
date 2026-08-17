import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { X, Briefcase, Clock, Tag, FileText, Layers, IndianRupee, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddInternshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function AddInternshipModal({ isOpen, onClose, onSuccess, initialData }: AddInternshipModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    domain: 'Software Development',
    duration: '',
    type: 'Remote',
    originalPrice: 2500,
    discountedPrice: 990,
    thumbnailUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=800',
    description: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          title: initialData.title || '',
          domain: initialData.domain || 'Software Development',
          duration: initialData.duration || '',
          type: initialData.type || 'Remote',
          originalPrice: initialData.originalPrice || 2500,
          discountedPrice: initialData.discountedPrice || 990,
          thumbnailUrl: initialData.thumbnailUrl || 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=800',
          description: initialData.description || '',
        });
      } else {
        setFormData({
          title: '',
          domain: 'Software Development',
          duration: '',
          type: 'Remote',
          originalPrice: 2500,
          discountedPrice: 990,
          thumbnailUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=800',
          description: '',
        });
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const internshipData = {
        title: formData.title,
        domain: formData.domain,
        duration: formData.duration,
        type: formData.type,
        originalPrice: Number(formData.originalPrice),
        discountedPrice: Number(formData.discountedPrice),
        thumbnailUrl: formData.thumbnailUrl,
        description: formData.description,
      };

      if (initialData?.id) {
        await updateDoc(doc(db, 'internships', initialData.id), internshipData);
        toast.success('Internship updated successfully!');
      } else {
        const newInternship = {
          ...internshipData,
          isActive: true,
          applicantsCount: 0,
        };
        await addDoc(collection(db, 'internships'), newInternship);
        toast.success('Internship added successfully!');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving internship:", error);
      toast.error('Failed to save internship');
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
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {initialData ? 'Edit Internship' : 'Add New Internship'}
            </h2>
            <p className="text-slate-500 font-medium text-xs">Configure internship details and domain.</p>
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
          <form id="internshipForm" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-teal-500"/> Title <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-xs sm:text-base"
                  placeholder="e.g. Frontend Developer Intern"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Layers size={14} className="text-teal-500"/> Domain
                </label>
                <select 
                  value={formData.domain}
                  onChange={e => setFormData({...formData, domain: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-xs sm:text-base bg-white"
                >
                  <option value="Software Development">Software Development</option>
                  <option value="Data Science & AI">Data Science & AI</option>
                  <option value="Marketing & Sales">Marketing & Sales</option>
                  <option value="Design">Design</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock size={14} className="text-teal-500"/> Duration <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.duration}
                  onChange={e => setFormData({...formData, duration: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-xs sm:text-base"
                  placeholder="e.g. 3 Months"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Tag size={14} className="text-teal-500"/> Mode
                </label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-xs sm:text-base bg-white"
                >
                  <option value="Remote">Remote</option>
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="bg-teal-50/70 p-4 rounded-2xl border border-teal-100">
              <h3 className="text-teal-900 font-bold mb-3 flex items-center gap-1.5 text-xs sm:text-sm">
                <IndianRupee size={16} /> Pricing (Per Month)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-teal-900/70 mb-1">Original Price (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.originalPrice}
                    onChange={e => setFormData({...formData, originalPrice: e.target.value as any})}
                    className="w-full bg-white border border-teal-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-xs sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-teal-900/70 mb-1">Discounted Price (₹)</label>
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
                <ImageIcon size={14} className="text-teal-500"/> Thumbnail Image URL
              </label>
              <input 
                type="url" 
                required
                value={formData.thumbnailUrl}
                onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-xs sm:text-base"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText size={14} className="text-teal-500"/> Description
              </label>
              <textarea 
                required
                rows={3}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium resize-none text-xs sm:text-base"
                placeholder="Brief description of the internship..."
              />
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
            form="internshipForm"
            type="submit"
            disabled={loading}
            className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20 flex items-center gap-2 disabled:opacity-70 text-xs sm:text-sm cursor-pointer active:scale-95"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              initialData ? 'Save Changes' : 'Add Internship'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
