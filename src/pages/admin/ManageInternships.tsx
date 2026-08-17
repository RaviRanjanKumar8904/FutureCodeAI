import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { Briefcase, Search, Plus, Trash2, Edit2, Eye, EyeOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import AddInternshipModal from '../../components/admin/AddInternshipModal';
import { logAdminActivity } from '../../utils/adminLogger';
import { useAuth } from '../../hooks/useAuth';

export default function ManageInternships() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInternship, setEditingInternship] = useState<any | null>(null);
  const [internships, setInternships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');

  const fetchInternships = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'internships'), orderBy('title'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInternships(data);
    } catch (error) {
      console.error("Error fetching internships:", error);
      toast.error("Failed to load internships");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInternships();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: boolean, title: string) => {
    try {
      await updateDoc(doc(db, 'internships', id), {
        isActive: !currentStatus
      });
      toast.success(`Internship ${!currentStatus ? 'activated' : 'moved to drafts'}`);
      await logAdminActivity(
        user?.email,
        'STATUS_CHANGE',
        `Internship: ${title}`,
        `Changed active status to ${!currentStatus}`
      );
      fetchInternships();
    } catch (error) {
      console.error("Error updating internship:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;

    try {
      await deleteDoc(doc(db, 'internships', id));
      toast.success("Internship deleted successfully");
      await logAdminActivity(
        user?.email,
        'DELETED',
        `Internship: ${title}`
      );
      fetchInternships();
    } catch (error) {
      console.error("Error deleting internship:", error);
      toast.error("Failed to delete internship");
    }
  };

  const domains = ['All', ...Array.from(new Set(internships.map(i => i.domain || 'General')))];

  const filteredData = internships.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.domain && item.domain.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDomain = selectedDomain === 'All' ? true : item.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 shadow-sm">
            <Briefcase size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Manage Internships</h1>
            <p className="text-sm text-slate-500 font-medium">Create, publish, and structure real-world internship tracks and stipends.</p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            setEditingInternship(null);
            setIsModalOpen(true);
          }}
          className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-md shadow-teal-600/20 flex items-center gap-2 self-start md:self-auto"
        >
          <Plus size={18} />
          <span>Add New Internship</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by title, domain, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium w-full focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1">
              <span className="text-xs font-bold text-slate-400 pl-1">Domain:</span>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent py-1 pr-2 outline-none cursor-pointer"
              >
                {domains.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500 px-2.5 py-1.5 bg-slate-200/60 rounded-lg">
              {filteredData.length} programs
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="py-24 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-24 text-center">
            <Briefcase size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-bold text-slate-700">No internships found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or create a new internship track.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredData.map((internship) => (
              <div 
                key={internship.id} 
                className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="rounded-md bg-teal-50 text-teal-700 px-2.5 py-1 text-xs font-bold uppercase tracking-wider">
                    {internship.domain || 'Tech'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${internship.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {internship.isActive ? 'Active' : 'Draft'}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug line-clamp-2">{internship.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">{internship.description || 'Hands-on practical industry internship track.'}</p>

                <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Duration</span>
                    <span className="font-bold text-slate-800">{internship.duration || '2-6 Months'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Stipend</span>
                    <span className="font-bold text-emerald-700">{internship.stipend || 'Performance Based'}</span>
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-500">
                    Applicants: <span className="text-teal-600 font-extrabold">{internship.applicantsCount ?? 0}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleStatus(internship.id, internship.isActive, internship.title)}
                      className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                        internship.isActive ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                      title={internship.isActive ? 'Deactivate' : 'Publish'}
                    >
                      {internship.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    
                    <button
                      onClick={() => {
                        setEditingInternship(internship);
                        setIsModalOpen(true);
                      }}
                      className="p-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-bold transition-colors"
                      title="Edit Internship"
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      onClick={() => handleDelete(internship.id, internship.title)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete Internship"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      <AddInternshipModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingInternship(null);
        }}
        onSuccess={() => {
          fetchInternships();
          if (editingInternship) {
            logAdminActivity(user?.email, 'UPDATED', `Internship: ${editingInternship.title}`);
          } else {
            logAdminActivity(user?.email, 'CREATED', 'New Internship');
          }
        }}
        initialData={editingInternship}
      />
    </div>
  );
}
