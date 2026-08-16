import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, deleteDoc, doc, query, where, writeBatch, addDoc, serverTimestamp, orderBy, updateDoc } from 'firebase/firestore';
import { Users, Search, Trash2, Mail, Eye, ShieldAlert, GraduationCap, Plus, Download, Upload, Award, CheckSquare, Square, Calendar, Filter, X, Edit2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import StudentProfileModal from '../../components/admin/StudentProfileModal';
import EnrollStudentModal from '../../components/admin/EnrollStudentModal';
import EditStudentModal from '../../components/admin/EditStudentModal';
import Papa from 'papaparse';

interface Student {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: string;
  createdAt: any;
  phone?: string;
  enrolledCourse?: string;
  assignedCenter?: string;
  batch?: string;
}

interface Enrollment {
  id: string;
  studentId: string;
  studentEmail: string;
  courseName: string;
  institute: string;
  batch: string;
  status: string;
}

function generateBatchOptions(): string[] {
  const batches: string[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    batches.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
  }
  return batches;
}

export default function ManageStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterCourse, setFilterCourse] = useState('');
  const [filterCenter, setFilterCenter] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [bulkBatch, setBulkBatch] = useState('');
  const [bulkCenter, setBulkCenter] = useState('');
  const csvRef = useRef<HTMLInputElement>(null);
  const batchOptions = generateBatchOptions();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersSnap, enrollSnap, , centersSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        getDocs(collection(db, 'enrollments')),
        getDocs(query(collection(db, 'courses'), orderBy('title'))),
        getDocs(query(collection(db, 'collaborators'), orderBy('name'))),
      ]);

      const enrollData = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));

      let data: Student[] = usersSnap.docs.map(d => {
        const raw = d.data();
        const enroll = enrollData.find(e => e.studentId === d.id || e.studentEmail === raw.email);
        return {
          id: d.id, ...raw,
          enrolledCourse: enroll?.courseName || '',
          assignedCenter: enroll?.institute || '',
          batch: enroll?.batch || '',
        } as Student;
      });
      data.sort((a, b) => {
        const getMs = (val: any) => {
          if (!val) return 0;
          if (typeof val.toMillis === 'function') return val.toMillis();
          if (val.seconds) return val.seconds * 1000;
          return Date.now(); // If it's a pending server timestamp, treat it as "just now"
        };
        return getMs(b.createdAt) - getMs(a.createdAt);
      });
      setStudents(data);

      setCenters(centersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((c: any) => c.isApproved));
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete student profile for ${name}?`)) return;
    const tid = toast.loading('Deleting...');
    try {
      await deleteDoc(doc(db, 'users', id));
      toast.success('Deleted', { id: tid });
      fetchAll();
    } catch { toast.error('Failed', { id: tid }); }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} student(s)? This cannot be undone.`)) return;
    const tid = toast.loading(`Deleting ${selectedIds.size} students...`);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => batch.delete(doc(db, 'users', id)));
      await batch.commit();
      toast.success(`${selectedIds.size} students deleted`, { id: tid });
      setSelectedIds(new Set());
      fetchAll();
    } catch { toast.error('Failed', { id: tid }); }
  };

  // Bulk certificate issue
  const handleBulkCertificate = async () => {
    if (selectedIds.size === 0) return;
    const selected = students.filter(s => selectedIds.has(s.id));
    if (!window.confirm(`Issue certificates for ${selected.length} student(s)?`)) return;
    const tid = toast.loading('Issuing certificates...');
    try {
      const batch = writeBatch(db);
      for (const s of selected) {
        const year = new Date().getFullYear();
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
        const certId = `FC-${year}-${rand}`;
        const certRef = doc(db, 'certificates', certId);
        batch.set(certRef, {
          certificateId: certId,
          studentName: s.displayName || s.email,
          courseName: s.enrolledCourse || 'General',
          issueDate: new Date().toISOString().split('T')[0],
          grade: '',
          issuedBy: 'Admin (Bulk)',
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
      toast.success(`${selected.length} certificates issued!`, { id: tid });
      setSelectedIds(new Set());
    } catch { toast.error('Failed to issue certificates', { id: tid }); }
  };

  // Bulk batch change
  const handleBulkBatchChange = async () => {
    if (!bulkBatch || selectedIds.size === 0) return;
    const tid = toast.loading('Updating batches...');
    try {
      for (const id of selectedIds) {
        const s = students.find(st => st.id === id);
        if (!s) continue;
        const enrollQ = query(collection(db, 'enrollments'), where('studentId', '==', id));
        const enrollSnap = await getDocs(enrollQ);
        if (!enrollSnap.empty) {
          await updateDoc(doc(db, 'enrollments', enrollSnap.docs[0].id), { batch: bulkBatch, batchTiming: bulkBatch });
        } else {
          // Create a new enrollment record for this student
          await addDoc(collection(db, 'enrollments'), {
            studentId: id, studentEmail: s.email, studentName: s.displayName || '',
            courseName: '', institute: 'FutureCodeAI (Online)', centerId: '',
            city: 'Online', batch: bulkBatch, batchTiming: bulkBatch,
            status: 'Ongoing', image: '', enrolledAt: serverTimestamp(),
          });
        }
      }
      toast.success('Batches updated!', { id: tid });
      setBulkBatch('');
      setSelectedIds(new Set());
      fetchAll();
    } catch { toast.error('Failed', { id: tid }); }
  };

  // Bulk center change
  const handleBulkCenterChange = async () => {
    if (!bulkCenter || selectedIds.size === 0) return;
    const center = centers.find(c => c.id === bulkCenter);
    if (!center) return;
    const tid = toast.loading('Updating centers...');
    try {
      const instituteId = center.linkedUserId || center.id || '';
      for (const id of selectedIds) {
        const s = students.find(st => st.id === id);
        if (!s) continue;
        const enrollQ = query(collection(db, 'enrollments'), where('studentId', '==', id));
        const enrollSnap = await getDocs(enrollQ);
        if (!enrollSnap.empty) {
          await updateDoc(doc(db, 'enrollments', enrollSnap.docs[0].id), {
            institute: center.name, centerId: center.id, instituteId, city: center.city || 'N/A',
          });
        } else {
          await addDoc(collection(db, 'enrollments'), {
            studentId: id, studentEmail: s.email, studentName: s.displayName || '',
            courseName: '', institute: center.name, centerId: center.id, instituteId,
            city: center.city || 'N/A', batch: '', batchTiming: '',
            status: 'Ongoing', image: '', enrolledAt: serverTimestamp(),
          });
        }
      }
      toast.success('Centers updated!', { id: tid });
      setBulkCenter('');
      setSelectedIds(new Set());
      fetchAll();
    } catch { toast.error('Failed', { id: tid }); }
  };

  // Export CSV
  const handleExportCSV = () => {
    const csvData = filteredData.map(s => ({
      Name: s.displayName || '',
      Email: s.email || '',
      Phone: (s as any).phone || '',
      Course: s.enrolledCourse || '',
      Center: s.assignedCenter || '',
      Batch: s.batch || '',
      RegisteredAt: s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : '',
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  // Import CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        if (rows.length === 0) { toast.error('Empty CSV'); return; }
        if (!window.confirm(`Import ${rows.length} student(s)?`)) return;
        const tid = toast.loading(`Importing ${rows.length} students...`);
        try {
          let count = 0;
          for (const row of rows) {
            if (!row.Email && !row.email) continue;
            const email = row.Email || row.email;
            const name = row.Name || row.name || row.StudentName || 'Imported Student';
            // Create user doc
            const userRef = await addDoc(collection(db, 'users'), {
              email, displayName: name,
              phone: row.Phone || row.phone || '',
              photoURL: '', role: 'student', status: 'active',
              enrolledByAdmin: true, createdAt: serverTimestamp(),
            });
            // Create enrollment if course provided
            if (row.Course || row.course) {
              await addDoc(collection(db, 'enrollments'), {
                studentId: userRef.id, studentEmail: email, studentName: name,
                courseName: row.Course || row.course,
                institute: row.Center || row.center || 'FutureCodeAI (Online)',
                batch: row.Batch || row.batch || batchOptions[0],
                batchTiming: row.Batch || row.batch || batchOptions[0],
                status: 'Ongoing', image: '', enrolledAt: serverTimestamp(),
              });
            }
            count++;
          }
          toast.success(`${count} students imported!`, { id: tid });
          fetchAll();
        } catch { toast.error('Import failed', { id: tid }); }
        if (csvRef.current) csvRef.current.value = '';
      },
    });
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === filteredData.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredData.map(s => s.id)));
  };

  // Filters
  const filteredData = students.filter(s => {
    const matchSearch = (s.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCourse = !filterCourse || s.enrolledCourse === filterCourse;
    const matchCenter = !filterCenter || s.assignedCenter === filterCenter;
    const matchBatch = !filterBatch || s.batch === filterBatch;
    return matchSearch && matchCourse && matchCenter && matchBatch;
  });

  const uniqueCourses = [...new Set(students.map(s => s.enrolledCourse).filter(Boolean))];
  const uniqueCenters = [...new Set(students.map(s => s.assignedCenter).filter(Boolean))];
  const uniqueBatches = [...new Set(students.map(s => s.batch).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto">
      <Toaster position="top-center" />
      <input type="file" ref={csvRef} accept=".csv" className="hidden" onChange={handleImportCSV} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Students Database</h1>
            <p className="text-slate-500 font-medium">Manage enrolled student accounts across the platform.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setIsEnrollOpen(true)}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20">
            <Plus size={16} /> Enroll Student
          </button>
          <button onClick={handleExportCSV}
            className="bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => csvRef.current?.click()}
            className="bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Upload size={16} /> Import CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col gap-3 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Search by name or email..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-medium w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm font-bold transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Filter size={16} /> Filters
              </button>
              <div className="text-sm font-bold text-slate-500 bg-white px-4 py-2 border border-slate-200 rounded-xl flex items-center gap-2">
                <GraduationCap size={18} className="text-blue-500" /> {filteredData.length}
              </div>
            </div>
          </div>

          {/* Filter Row */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 pt-2">
              <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="">All Courses</option>
                {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterCenter} onChange={e => setFilterCenter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="">All Centers</option>
                {uniqueCenters.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="">All Batches</option>
                {uniqueBatches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              {(filterCourse || filterCenter || filterBatch) && (
                <button onClick={() => { setFilterCourse(''); setFilterCenter(''); setFilterBatch(''); }}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-bold flex items-center gap-1">
                  <X size={14} /> Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                <th className="p-4 pl-4 w-10">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-blue-600">
                    {selectedIds.size === filteredData.length && filteredData.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="p-4">Student Info</th>
                <th className="p-4 hidden lg:table-cell">Course</th>
                <th className="p-4 hidden md:table-cell">Center</th>
                <th className="p-4 hidden md:table-cell">Batch</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500 font-medium">Loading...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4 mx-auto"><Users size={32} /></div>
                  <p className="text-slate-900 font-bold text-lg mb-1">No Students Found</p>
                  <p className="text-slate-500 text-sm">No student accounts match your search.</p>
                </td></tr>
              ) : (
                filteredData.map((student) => (
                  <tr key={student.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.has(student.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="p-4 pl-4 align-middle">
                      <button onClick={() => toggleSelect(student.id)} className="text-slate-400 hover:text-blue-600">
                        {selectedIds.has(student.id) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                      </button>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">
                          {student.displayName ? student.displayName.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{student.displayName || 'Unnamed'}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1"><Mail size={12} /> {student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 align-middle hidden lg:table-cell">
                      <span className={`text-sm font-medium ${student.enrolledCourse ? 'text-slate-700' : 'text-slate-400'}`}>
                        {student.enrolledCourse || '—'}
                      </span>
                    </td>
                    <td className="p-4 align-middle hidden md:table-cell">
                      <span className={`text-sm font-medium ${student.assignedCenter ? 'text-slate-700' : 'text-slate-400'}`}>
                        {student.assignedCenter || '—'}
                      </span>
                    </td>
                    <td className="p-4 align-middle hidden md:table-cell">
                      {student.batch ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700">
                          <Calendar size={12} /> {student.batch}
                        </span>
                      ) : <span className="text-slate-400 text-sm">—</span>}
                    </td>
                    <td className="p-4 align-middle text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Active</span>
                    </td>
                    <td className="p-4 pr-6 align-middle text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setSelectedStudent(student); setIsProfileOpen(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Profile">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => { setSelectedStudent(student); setIsEditOpen(true); }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit Student">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(student.id, student.displayName || 'student')}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50 flex-wrap justify-center">
          <span className="font-bold text-sm">{selectedIds.size} selected</span>
          <div className="w-px h-6 bg-slate-700" />
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-sm font-bold transition-colors">
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={handleBulkCertificate} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-bold transition-colors">
            <Award size={14} /> Issue Cert
          </button>
          <div className="flex items-center gap-1">
            <select value={bulkBatch} onChange={e => setBulkBatch(e.target.value)}
              className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-medium">
              <option value="">Batch...</option>
              {batchOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {bulkBatch && <button onClick={handleBulkBatchChange} className="px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-bold">Apply</button>}
          </div>
          <div className="flex items-center gap-1">
            <select value={bulkCenter} onChange={e => setBulkCenter(e.target.value)}
              className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-medium">
              <option value="">Center...</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {bulkCenter && <button onClick={handleBulkCenterChange} className="px-2 py-1.5 bg-teal-600 hover:bg-teal-700 rounded-lg text-xs font-bold">Apply</button>}
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="p-1.5 hover:bg-slate-700 rounded-lg"><X size={16} /></button>
        </div>
      )}

      {/* Alert */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
        <ShieldAlert size={20} className="shrink-0 text-amber-600" />
        <div>
          <p className="font-bold mb-1">Administrative Note regarding Deletions</p>
          <p className="text-amber-700/90 leading-relaxed font-medium">
            Deleting a student profile here removes their Firestore data record. To completely revoke login access, their Authentication credential must also be deleted via the Firebase Console or a dedicated Cloud Function.
          </p>
        </div>
      </div>

      {/* Modals */}
      <StudentProfileModal isOpen={isProfileOpen} onClose={() => { setIsProfileOpen(false); setSelectedStudent(null); }} student={selectedStudent} />
      <EnrollStudentModal isOpen={isEnrollOpen} onClose={() => setIsEnrollOpen(false)} onSuccess={fetchAll} />
      <EditStudentModal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setSelectedStudent(null); }} onSuccess={fetchAll} student={selectedStudent} />
    </div>
  );
}
