import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { Building2, Search, CheckCircle2, Image as ImageIcon, Pencil, Trash2, UserCheck, Link2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import AddCollaboratorModal from '../../components/admin/AddCollaboratorModal';
import ApproveInstituteModal from '../../components/admin/ApproveInstituteModal';

export default function ManageCollaborators() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCollab, setEditingCollab] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [selectedPendingUser, setSelectedPendingUser] = useState<any>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Approved' | 'Accounts'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCollaborators = async () => {
    setLoading(true);
    try {
      const [collabSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, 'collaborators'), orderBy('name'))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'institute'), where('status', '==', 'pending_verification')))
      ]);

      const data = collabSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const pendingAccounts = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
      
      setCollaborators(data);
      setPendingUsers(pendingAccounts);
    } catch (error) {
      console.error("Error fetching collaborators:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollaborators();
  }, []);

  const handleUpdateStatus = async (id: string, isApproved: boolean, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'collaborators', id), {
        isApproved,
        isActive
      });
      toast.success(`Collaborator ${isApproved ? 'approved' : 'rejected'}`);
      fetchCollaborators();
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to completely delete "${name}"? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'collaborators', id));
        toast.success(`Collaborator deleted`);
        fetchCollaborators();
      } catch (error) {
        console.error("Error deleting:", error);
        toast.error("Failed to delete collaborator");
      }
    }
  };

  const filteredData = collaborators.filter(collab => {
    const matchesTab = 
      activeTab === 'All' ? true : 
      activeTab === 'Pending' ? !collab.isApproved : 
      activeTab === 'Approved' ? collab.isApproved : true;
      
    const matchesSearch = (collab.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (collab.city && collab.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (collab.email && collab.email.toLowerCase().includes(searchTerm.toLowerCase()));
                          
    return matchesTab && matchesSearch;
  });

  const filteredPendingUsers = pendingUsers.filter(u => 
    (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <Toaster position="top-center" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Manage Collaborators</h1>
            <p className="text-slate-500 font-medium">Approve and link partner institutes & colleges.</p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            setEditingCollab(null);
            setIsAddModalOpen(true);
          }}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          + Add Collaborator
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50">
          <div className="flex bg-slate-100 p-1 rounded-lg w-fit flex-wrap gap-1">
            {[
              { id: 'All', label: 'All Partners' },
              { id: 'Pending', label: 'Pending Listings' },
              { id: 'Approved', label: 'Approved' },
              { id: 'Accounts', label: `Pending Accounts (${pendingUsers.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {tab.id === 'Accounts' && pendingUsers.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-medium w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Content */}
        {activeTab === 'Accounts' ? (
          /* Pending Institute Accounts Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4 pl-6">Institute User Account</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 font-medium">Loading...</td>
                  </tr>
                ) : filteredPendingUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 font-medium">
                      No pending institute user accounts awaiting verification.
                    </td>
                  </tr>
                ) : (
                  filteredPendingUsers.map((pUser) => (
                    <tr key={pUser.uid} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4 pl-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 overflow-hidden font-bold">
                          {pUser.photoURL ? (
                            <img src={pUser.photoURL} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Building2 size={18} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{pUser.displayName || 'New Institute'}</p>
                          <p className="text-xs text-slate-500 font-medium">{pUser.email}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">UID: {pUser.uid}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-700">{pUser.contactPerson || '—'}</p>
                        <p className="text-xs text-slate-500 font-medium">{pUser.phone || 'No phone'}</p>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          Pending Verification
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => {
                            setSelectedPendingUser(pUser);
                            setIsApproveModalOpen(true);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 ml-auto"
                        >
                          <UserCheck size={14} /> Approve & Link Account
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Partner Listings Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4 pl-6">Collaborator</th>
                  <th className="p-4">Type & Location</th>
                  <th className="p-4">Linked User Account</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">Loading...</td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">No collaborators found matching your criteria.</td>
                  </tr>
                ) : (
                  filteredData.map((collab) => (
                    <tr key={collab.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4 pl-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                          {collab.logoUrl ? (
                            <img src={collab.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={18} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{collab.name}</p>
                          <p className="text-xs text-slate-500 font-medium">{collab.email || 'No email'}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-700">{collab.type}</p>
                        <p className="text-xs text-slate-500 font-medium">{collab.city}</p>
                      </td>
                      <td className="p-4">
                        {collab.linkedUserId ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <Link2 size={12} /> {collab.linkedUserId.substring(0, 10)}...
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Unlinked</span>
                        )}
                      </td>
                      <td className="p-4">
                        {collab.isApproved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={14} /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            Pending Approval
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!collab.isApproved ? (
                            <button 
                              onClick={() => handleUpdateStatus(collab.id, true, true)}
                              className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold rounded-lg transition-colors"
                            >
                              Approve
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleUpdateStatus(collab.id, false, false)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold rounded-lg transition-colors"
                            >
                              Revoke
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setEditingCollab(collab);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(collab.id, collab.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddCollaboratorModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCollab(null);
        }} 
        onSuccess={fetchCollaborators}
        initialData={editingCollab} 
      />

      <ApproveInstituteModal
        isOpen={isApproveModalOpen}
        onClose={() => {
          setIsApproveModalOpen(false);
          setSelectedPendingUser(null);
        }}
        onSuccess={fetchCollaborators}
        pendingUser={selectedPendingUser}
        collaborators={collaborators}
      />
    </div>
  );
}
