import { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { X, Building2, UserCheck, Link2, CheckCircle2, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApproveInstituteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pendingUser: any;
  collaborators: any[];
}

export default function ApproveInstituteModal({
  isOpen,
  onClose,
  onSuccess,
  pendingUser,
  collaborators
}: ApproveInstituteModalProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'create' | 'link'>('create');
  const [selectedCollabId, setSelectedCollabId] = useState('');
  const [formData, setFormData] = useState({
    name: pendingUser?.displayName || '',
    type: 'Coaching Institute',
    city: pendingUser?.city || '',
    address: pendingUser?.address || '',
    email: pendingUser?.email || '',
    phone: pendingUser?.phone || '',
    contactPerson: pendingUser?.contactPerson || pendingUser?.displayName || '',
    description: pendingUser?.description || '',
    logoUrl: pendingUser?.photoURL || '',
  });

  if (!isOpen || !pendingUser) return null;

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Processing approval & linking...');

    try {
      if (mode === 'create') {
        if (!formData.name || !formData.city) {
          toast.error('Name and City are required', { id: toastId });
          setLoading(false);
          return;
        }

        // 1. Create a matching collaborator record tied to this user UID
        await addDoc(collection(db, 'collaborators'), {
          name: formData.name,
          type: formData.type,
          city: formData.city,
          address: formData.address,
          email: formData.email,
          phone: formData.phone,
          contactPerson: formData.contactPerson,
          description: formData.description,
          logoUrl: formData.logoUrl,
          galleryUrls: [],
          linkedUserId: pendingUser.uid,
          isApproved: true,
          isActive: true,
          createdAt: new Date().toISOString()
        });
      } else {
        if (!selectedCollabId) {
          toast.error('Please select an existing collaborator listing to link', { id: toastId });
          setLoading(false);
          return;
        }

        // 2. Link existing collaborator document to this user UID
        await updateDoc(doc(db, 'collaborators', selectedCollabId), {
          linkedUserId: pendingUser.uid,
          isApproved: true,
          isActive: true
        });
      }

      // 3. Activate the institute user account
      await updateDoc(doc(db, 'users', pendingUser.uid), {
        status: 'active',
        displayName: formData.name || pendingUser.displayName,
        phone: formData.phone || pendingUser.phone || '',
        contactPerson: formData.contactPerson || '',
        description: formData.description || ''
      });

      toast.success('Institute account approved and linked successfully!', { id: toastId });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error approving institute account:', error);
      toast.error('Failed to approve account: ' + (error?.message || ''), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm(`Are you sure you want to reject and deactivate ${pendingUser.displayName || pendingUser.email}?`)) {
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Rejecting account...');
    try {
      await updateDoc(doc(db, 'users', pendingUser.uid), {
        status: 'rejected'
      });
      toast.success('Account rejected', { id: toastId });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error rejecting account:', error);
      toast.error('Failed to reject account', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Approve Institute Account</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Link <strong className="text-slate-700">{pendingUser.email}</strong> to a collaborator profile.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApprove} className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'create'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck size={16} /> Create New Listing
            </button>
            <button
              type="button"
              onClick={() => setMode('link')}
              className={`py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'link'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 size={16} /> Link to Existing
            </button>
          </div>

          {mode === 'link' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Existing Collaborator
                </label>
                <select
                  value={selectedCollabId}
                  onChange={(e) => setSelectedCollabId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">-- Choose a collaborator --</option>
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city || 'No city'}) {c.linkedUserId ? '• [Already Linked]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-900 text-xs leading-relaxed">
                <strong>How this works:</strong> Storing the user's UID (<code>{pendingUser.uid}</code>) on the selected collaborator profile allows this institute to view their enrolled students, assigned courses, and leads in the Institute Dashboard.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Institute Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Coaching Institute">Coaching Institute</option>
                    <option value="College">College</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Primary Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Registered Email (Read-only)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={pendingUser.email}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Public Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Overview of the coaching center or college..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={handleReject}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <UserX size={16} /> Reject Account
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Approve & Link
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
