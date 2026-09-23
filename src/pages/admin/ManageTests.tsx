import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import { ClipboardCheck, Search, Plus, Trash2, Edit2, Eye, EyeOff, ListChecks, Users, Clock, Target } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import AddTestModal from '../../components/admin/AddTestModal';
import ManageQuestions from '../../components/admin/ManageQuestions';
import TestSubmissionsView from '../../components/admin/TestSubmissionsView';
import { logAdminActivity } from '../../utils/adminLogger';
import { useAuth } from '../../hooks/useAuth';

export default function ManageTests() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<any | null>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [questionsTest, setQuestionsTest] = useState<any | null>(null);
  const [submissionsTest, setSubmissionsTest] = useState<any | null>(null);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'tests'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTests(data);
    } catch (error) {
      console.error("Error fetching tests:", error);
      toast.error("Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: boolean, title: string) => {
    try {
      await updateDoc(doc(db, 'tests', id), {
        isActive: !currentStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Test ${!currentStatus ? 'published' : 'moved to drafts'}`);
      await logAdminActivity(
        user?.email,
        'STATUS_CHANGE',
        `Test: ${title}`,
        `Changed active status to ${!currentStatus}`
      );
      fetchTests();
    } catch (error) {
      console.error("Error updating test:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"? This will also delete all questions and cannot be undone.`)) return;

    try {
      const qSnap = await getDocs(collection(db, 'tests', id, 'questions'));
      if (!qSnap.empty) {
        const batch = writeBatch(db);
        qSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(doc(db, 'tests', id));
      toast.success("Test deleted successfully");
      await logAdminActivity(
        user?.email,
        'DELETED',
        `Test: ${title}`
      );
      fetchTests();
    } catch (error) {
      console.error("Error deleting test:", error);
      toast.error("Failed to delete test");
    }
  };

  const types = ['All', 'mcq', 'coding', 'mixed'];

  const filteredData = tests.filter(item => {
    const matchesSearch = (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.courseName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All' ? true : item.type === selectedType;
    return matchesSearch && matchesType;
  });

  const typeLabel = (type: string) => {
    switch (type) {
      case 'mcq': return 'MCQ';
      case 'coding': return 'Coding';
      case 'mixed': return 'Mixed';
      default: return type;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'mcq': return 'bg-indigo-50 text-indigo-700';
      case 'coding': return 'bg-teal-50 text-teal-700';
      case 'mixed': return 'bg-purple-50 text-purple-700';
      default: return 'bg-slate-50 text-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Manage Tests</h1>
            <p className="text-sm text-slate-500 font-medium">Create MCQ & coding tests, manage questions, and review submissions.</p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            setEditingTest(null);
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 flex items-center gap-2 self-start md:self-auto"
        >
          <Plus size={18} />
          <span>Create New Test</span>
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
              placeholder="Search by title, course, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-sm font-medium w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1 min-h-[44px]">
              <span className="text-xs font-bold text-slate-400 pl-1">Type:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent py-1 pr-2 outline-none cursor-pointer"
              >
                {types.map((t) => (
                  <option key={t} value={t}>{t === 'All' ? 'All' : typeLabel(t)}</option>
                ))}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500 px-2.5 py-1.5 bg-slate-200/60 rounded-lg">
              {filteredData.length} tests
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="py-24 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-24 text-center">
            <ClipboardCheck size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-bold text-slate-700">No tests found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or create a new test.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 sm:p-6">
            {filteredData.map((test) => (
              <div 
                key={test.id} 
                className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${typeColor(test.type)}`}>
                    {typeLabel(test.type)}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${test.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {test.isActive ? 'Active' : 'Draft'}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 leading-snug line-clamp-2">{test.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">{test.description || 'No description provided.'}</p>

                <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Duration</span>
                      <span className="font-bold text-slate-800">{test.durationMinutes || 30} min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ListChecks size={12} className="text-slate-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Questions</span>
                      <span className="font-bold text-slate-800">{test.questionsCount || 0} ({test.totalMarks || 0} marks)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target size={12} className="text-slate-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Pass %</span>
                      <span className="font-bold text-slate-800">{test.passPercentage || 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={12} className="text-slate-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Attempts</span>
                      <span className="font-bold text-slate-800">{test.maxAttempts === 0 ? '∞' : test.maxAttempts || 1}</span>
                    </div>
                  </div>
                </div>

                {test.courseName && (
                  <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg mb-4 truncate">
                    📘 {test.courseName}
                  </div>
                )}

                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSubmissionsTest(test)}
                    className="min-h-[40px] text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <Users size={14} /> Submissions
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setQuestionsTest(test)}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="Manage Questions"
                      aria-label="Manage Questions"
                    >
                      <ListChecks size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(test.id, test.isActive, test.title)}
                      className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        test.isActive ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                      title={test.isActive ? 'Deactivate' : 'Publish'}
                      aria-label="Toggle status"
                    >
                      {test.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    
                    <button
                      onClick={() => {
                        setEditingTest(test);
                        setIsModalOpen(true);
                      }}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="Edit Test"
                      aria-label="Edit Test"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(test.id, test.title)}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Delete Test"
                      aria-label="Delete Test"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Test Modal */}
      <AddTestModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTest(null);
        }}
        onSuccess={() => {
          fetchTests();
          if (editingTest) {
            logAdminActivity(user?.email, 'UPDATED', `Test: ${editingTest.title}`);
          } else {
            logAdminActivity(user?.email, 'CREATED', 'New Test');
          }
        }}
        initialData={editingTest}
      />

      {/* Manage Questions Modal */}
      <ManageQuestions
        isOpen={!!questionsTest}
        onClose={() => setQuestionsTest(null)}
        test={questionsTest}
        onQuestionsUpdated={fetchTests}
      />

      {/* View Submissions Modal */}
      <TestSubmissionsView
        isOpen={!!submissionsTest}
        onClose={() => setSubmissionsTest(null)}
        test={submissionsTest}
      />
    </div>
  );
}
