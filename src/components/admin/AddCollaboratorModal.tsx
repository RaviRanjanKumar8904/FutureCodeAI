import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { X, Building2, MapPin, Mail, Phone, Link as LinkIcon, FileText, User, Image as ImageIcon, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function AddCollaboratorModal({ isOpen, onClose, onSuccess, initialData }: AddCollaboratorModalProps) {
  const [loading, setLoading] = useState(false);
  const [instituteUsers, setInstituteUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'College',
    city: '',
    address: '',
    email: '',
    phone: '',
    contactPerson: '',
    logoUrl: '',
    description: '',
    linkedUserId: '',
    galleryUrlsString: ''
  });

  useEffect(() => {
    if (!isOpen) return;

    const fetchInstituteUsers = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'institute'));
        const snap = await getDocs(q);
        setInstituteUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error loading institute users:", err);
      }
    };
    fetchInstituteUsers();

    if (initialData) {
      setFormData({
        name: initialData.name || '',
        type: initialData.type || 'College',
        city: initialData.city || '',
        address: initialData.address || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        contactPerson: initialData.contactPerson || '',
        logoUrl: initialData.logoUrl || '',
        description: initialData.description || '',
        linkedUserId: initialData.linkedUserId || initialData.userId || initialData.uid || '',
        galleryUrlsString: initialData.galleryUrls ? initialData.galleryUrls.join(', ') : ''
      });
    } else {
      setFormData({
        name: '',
        type: 'College',
        city: '',
        address: '',
        email: '',
        phone: '',
        contactPerson: '',
        logoUrl: '',
        description: '',
        linkedUserId: '',
        galleryUrlsString: ''
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.type || !formData.city) {
      toast.error("Name, Type, and City are required");
      return;
    }

    setLoading(true);
    try {
      // Convert comma-separated string to array
      const galleryUrls = formData.galleryUrlsString
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      const submissionData = {
        name: formData.name,
        type: formData.type,
        city: formData.city,
        address: formData.address,
        email: formData.email,
        phone: formData.phone,
        contactPerson: formData.contactPerson,
        logoUrl: formData.logoUrl,
        description: formData.description,
        linkedUserId: formData.linkedUserId || '',
        galleryUrls
      };

      if (initialData?.id) {
        await updateDoc(doc(db, 'collaborators', initialData.id), submissionData);
        toast.success("Collaborator updated successfully!");
      } else {
        await addDoc(collection(db, 'collaborators'), {
          ...submissionData,
          isApproved: true,
          isActive: true,
          createdAt: new Date().toISOString()
        });
        toast.success("Collaborator added successfully!");
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving collaborator:", error);
      toast.error("Failed to save collaborator");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              {initialData ? 'Edit Collaborator' : 'Add Collaborator'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="add-collaborator-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Organization Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    placeholder="E.g. Tech University"
                  />
                </div>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                >
                  <option value="College">College / University</option>
                  <option value="School">School</option>
                  <option value="Corporate">Corporate / Industry</option>
                  <option value="Institute">Training Institute</option>
                  <option value="Government">Government Body</option>
                </select>
              </div>

              {/* City */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">City *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    placeholder="E.g. Bangalore"
                  />
                </div>
              </div>

              {/* Logo URL */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Logo URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="url"
                    name="logoUrl"
                    value={formData.logoUrl}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Contact Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    placeholder="contact@institute.edu"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Contact Phone</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    placeholder="+91..."
                  />
                </div>
              </div>
              
              {/* Contact Person */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-bold text-slate-700">Contact Person (Name & Designation)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    placeholder="E.g. Dr. John Doe, Head of CSE"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-bold text-slate-700">Full Address</label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <MapPin size={16} className="text-slate-400" />
                  </div>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={2}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
                    placeholder="Complete physical address..."
                  />
                </div>
              </div>

              {/* Linked Institute Account (UID) */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>Linked Institute Account (Firebase UID)</span>
                  <span className="text-xs font-normal text-slate-500">Ties student enrollments to their institute portal</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserCheck size={16} className="text-indigo-500" />
                  </div>
                  <select
                    name="linkedUserId"
                    value={formData.linkedUserId}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors bg-white font-medium"
                  >
                    <option value="">-- No Linked Account (Unlinked) --</option>
                    {instituteUsers.map(u => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName || 'Unnamed Institute'} — {u.email} ({u.uid.substring(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-bold text-slate-700">About the Collaborator</label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText size={16} className="text-slate-400" />
                  </div>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
                    placeholder="Brief description of the partnership or institute..."
                  />
                </div>
              </div>

              {/* Gallery URLs */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-bold text-slate-700">Gallery Image URLs (Comma Separated)</label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <ImageIcon size={16} className="text-slate-400" />
                  </div>
                  <textarea
                    name="galleryUrlsString"
                    value={formData.galleryUrlsString}
                    onChange={handleChange}
                    rows={2}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
                    placeholder="https://image1.jpg, https://image2.jpg..."
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 bg-slate-50 flex items-center justify-end gap-3 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-collaborator-form"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center min-w-[120px]"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              initialData ? 'Save Changes' : 'Add Collaborator'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
