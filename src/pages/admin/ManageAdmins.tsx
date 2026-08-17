import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Shield, ShieldAlert, Trash2, Plus, UserPlus } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { logAdminActivity } from '../../utils/adminLogger';

interface AdminUser {
  id: string; // same as uid
  email: string;
  role: 'admin' | 'super_admin';
  addedBy: string;
  createdAt: string;
}

export default function ManageAdmins() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  const [newEmail, setNewEmail] = useState('');
  const [newUid, setNewUid] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) return;
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists() && adminDoc.data().role === 'super_admin') {
          setIsSuperAdmin(true);
        }
      } catch (error) {
        console.error("Not super admin", error);
      }
    };
    checkSuperAdmin();
  }, [user]);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'admins'));
        const adminList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AdminUser[];
        setAdmins(adminList);
      } catch (error) {
        console.error("Error fetching admins:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newUid) {
      toast.error("Please fill in both email and UID");
      return;
    }
    
    setIsAdding(true);
    try {
      // 1. Add to admins collection (allow-list)
      await setDoc(doc(db, 'admins', newUid), {
        email: newEmail,
        role: 'admin',
        addedBy: user?.email,
        createdAt: new Date().toISOString()
      });
      
      // 2. If the user already exists, promote them immediately.
      //    If they don't exist yet, store a pendingRole flag so that
      //    AuthContext promotes them on their very first sign-in.
      const userRef = doc(db, 'users', newUid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await setDoc(userRef, { role: 'admin' }, { merge: true });
        toast.success("Admin added — role updated immediately.");
      } else {
        // User hasn't signed up yet; store the intent on the admins doc
        await setDoc(doc(db, 'admins', newUid), { pendingRole: 'admin' }, { merge: true });
        toast.success("Admin allow-listed — role will apply on their first sign-in.");
      }
      setAdmins([...admins, { 
        id: newUid, 
        email: newEmail, 
        role: 'admin', 
        addedBy: user?.email || 'Unknown',
        createdAt: new Date().toISOString()
      }]);
      
      await logAdminActivity(
        user?.email,
        'INVITE',
        `Admin: ${newEmail}`,
        `Granted admin privileges to UID: ${newUid}`
      );

      setNewEmail('');
      setNewUid('');
    } catch (error) {
      console.error("Error adding admin:", error);
      toast.error("Failed to add admin. Check permissions.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAdmin = async (uid: string, email: string) => {
    if (uid === user?.uid) {
      toast.error("You cannot remove yourself");
      return;
    }
    
    const confirm = window.confirm(`Are you sure you want to remove ${email} from the admin allow-list? They will instantly lose all admin privileges.`);
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, 'admins', uid));
      
      // Attempt to demote in users collection as well
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await setDoc(userRef, { role: 'student' }, { merge: true });
      }

      toast.success("Admin removed successfully");
      await logAdminActivity(
        user?.email,
        'DELETED',
        `Admin: ${email}`,
        `Revoked admin privileges for UID: ${uid}`
      );
      setAdmins(admins.filter(a => a.id !== uid));
    } catch (error) {
      console.error("Error removing admin:", error);
      toast.error("Failed to remove admin.");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Toaster position="top-center" />
      
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Manage Admins</h1>
          <p className="text-slate-500 font-medium">Super Admin control panel for the platform allow-list.</p>
        </div>
      </div>

      {!isSuperAdmin ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-600">
          <ShieldAlert size={48} className="mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="font-medium">You must be a Super Admin to view or modify the admin allow-list.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          {/* Add Admin Form */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm sticky top-24">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <UserPlus size={18} className="text-indigo-600" />
                Add New Admin
              </h3>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">User Email</label>
                  <input 
                    type="email" 
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                    placeholder="admin@futurecode.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Firebase UID</label>
                  <input 
                    type="text" 
                    value={newUid}
                    onChange={(e) => setNewUid(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                    placeholder="Paste exact UID here"
                  />
                  <p className="text-xs text-slate-500 mt-1">UID must match their authenticated Firebase account exactly.</p>
                </div>
                <button 
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-70 mt-2"
                >
                  {isAdding ? "Adding..." : "Add to Allow-list"}
                  {!isAdding && <Plus size={18} />}
                </button>
              </form>
            </div>
          </div>

          {/* Admin List */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Current Admins</h3>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {admins.length} Total
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {admins.map((admin) => (
                  <li key={admin.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        admin.role === 'super_admin' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        <Shield size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{admin.email}</p>
                        <div className="flex items-center gap-2 text-xs font-medium mt-1">
                          <span className={`px-2 py-0.5 rounded-md ${
                            admin.role === 'super_admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                          </span>
                          <span className="text-slate-400 font-mono">UID: {admin.id.substring(0,8)}...</span>
                        </div>
                      </div>
                    </div>
                    {admin.role !== 'super_admin' && (
                      <button 
                        onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove Admin"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
