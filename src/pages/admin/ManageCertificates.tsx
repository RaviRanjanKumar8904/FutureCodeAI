import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { collection, setDoc, updateDoc, deleteDoc, getDocs, getDoc, doc, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Award, Plus, Trash2, Search, Copy, CheckCircle2, X, Upload, RotateCcw, Ban, Eye } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import Papa from 'papaparse';
import CertificateModal from '../../components/certificate/CertificateModal';
import type { CertificateData } from '../../components/certificate/CourseCertificate';

interface Certificate {
  id: string;
  certificateId: string;
  studentName: string;
  studentEmail?: string;
  courseName: string;
  domain?: string;
  gender?: string;
  issueDate: string;
  startDate?: string;
  endDate?: string;
  grade: string;
  marksPercentage?: string;
  issuedBy: string;
  createdAt: any;
  revoked?: boolean;
}

export default function ManageCertificates() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    studentName: '',
    studentEmail: '',
    courseName: '',
    domain: '',
    gender: '' as '' | 'Male' | 'Female',
    issueDate: new Date().toISOString().split('T')[0],
    startDate: '',
    endDate: '',
    grade: '',
    marksPercentage: '',
  });

  // Certificate preview state
  const [previewCert, setPreviewCert] = useState<CertificateData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Bulk Upload State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState<Array<{ studentName: string; courseName: string; issueDate: string; grade: string }>>([])
  const [bulkUploading, setBulkUploading] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'certificates'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data: Certificate[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certificate));
      setCertificates(data);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleGenerateId = async (): Promise<string> => {
    const year = new Date().getFullYear();
    let certId: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      certId = `FC-${year}-${randomStr}`;
      const existing = await getDoc(doc(db, 'certificates', certId));
      if (!existing.exists()) return certId;
      attempts++;
    } while (attempts < maxAttempts);

    throw new Error('Failed to generate a unique certificate ID after multiple attempts.');
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName || !formData.courseName || !formData.issueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Issuing certificate...");

    try {
      const certId = await handleGenerateId();
      
      const certData = {
        ...formData,
        certificateId: certId,
        issuedBy: user?.email || 'Admin',
        createdAt: serverTimestamp()
      };
      // Remove empty optional fields
      const cleanData = Object.fromEntries(Object.entries(certData).filter(([, v]) => v !== ''));
      await setDoc(doc(db, 'certificates', certId), cleanData);

      toast.success(`Certificate ${certId} issued!`, { id: toastId });
      setShowModal(false);
      setFormData({
        studentName: '',
        studentEmail: '',
        courseName: '',
        domain: '',
        gender: '' as '' | 'Male' | 'Female',
        issueDate: new Date().toISOString().split('T')[0],
        startDate: '',
        endDate: '',
        grade: '',
        marksPercentage: '',
      });
      fetchCertificates();
    } catch (error) {
      console.error("Error issuing certificate:", error);
      toast.error("Failed to issue certificate", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (id: string, certId: string) => {
    if (!window.confirm(`Are you sure you want to revoke certificate ${certId}? This will invalidate any verification attempts.`)) {
      return;
    }

    const toastId = toast.loading("Revoking certificate...");
    try {
      await updateDoc(doc(db, 'certificates', id), {
        revoked: true,
        revokedAt: serverTimestamp()
      });
      toast.success("Certificate revoked successfully", { id: toastId });
      fetchCertificates();
    } catch (error) {
      console.error("Error revoking certificate:", error);
      toast.error("Failed to revoke certificate", { id: toastId });
    }
  };

  const handleUnrevoke = async (id: string, certId: string) => {
    if (!window.confirm(`Are you sure you want to unrevoke certificate ${certId}? This will restore its valid status.`)) {
      return;
    }

    const toastId = toast.loading("Unrevoking certificate...");
    try {
      await updateDoc(doc(db, 'certificates', id), {
        revoked: false,
        revokedAt: null
      });
      toast.success("Certificate restored successfully", { id: toastId });
      fetchCertificates();
    } catch (error) {
      console.error("Error unrevoking certificate:", error);
      toast.error("Failed to restore certificate", { id: toastId });
    }
  };

  const handleDeletePermanently = async (id: string, certId: string, studentName: string) => {
    if (!window.confirm(`⚠️ PERMANENT DELETE: Are you sure you want to permanently delete certificate "${certId}" for ${studentName}?\n\nThis will completely remove it from the database and cannot be undone.`)) {
      return;
    }

    const toastId = toast.loading("Permanently deleting certificate...");
    try {
      await deleteDoc(doc(db, 'certificates', id));
      toast.success("Certificate permanently deleted", { id: toastId });
      fetchCertificates();
    } catch (error) {
      console.error("Error deleting certificate:", error);
      toast.error("Failed to delete certificate", { id: toastId });
    }
  };

  const copyVerificationLink = (id: string) => {
    const url = `${window.location.origin}/verify?id=${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Verification link copied!");
  };

  // ---- Bulk Upload Logic ----

  const handleCsvParse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        const parsed = rows
          .map(row => ({
            studentName: (row.studentName || row['Student Name'] || '').trim(),
            courseName: (row.courseName || row['Course Name'] || '').trim(),
            issueDate: (row.issueDate || row['Issue Date'] || '').trim(),
            grade: (row.grade || row['Grade'] || '').trim(),
          }))
          .filter(r => r.studentName && r.courseName);

        if (parsed.length === 0) {
          toast.error('CSV contains no valid rows. Ensure columns: studentName, courseName, issueDate, grade');
          return;
        }

        setBulkData(parsed);
        setShowBulkModal(true);
      },
      error: () => {
        toast.error('Failed to parse CSV file');
      }
    });

    // Reset input so re-selecting the same file works
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const generateIdSync = () => {
    const year = new Date().getFullYear();
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `FC-${year}-${randomStr}`;
  };

  const handleBulkConfirm = async () => {
    setBulkUploading(true);
    const toastId = toast.loading(`Issuing ${bulkData.length} certificates...`);

    try {
      // Generate unique IDs for all rows first
      const existingIds = new Set(certificates.map(c => c.certificateId));
      const entries: Array<{ certId: string; row: typeof bulkData[0] }> = [];

      for (const row of bulkData) {
        let certId: string;
        let attempts = 0;
        do {
          certId = generateIdSync();
          attempts++;
        } while ((existingIds.has(certId) || entries.some(e => e.certId === certId)) && attempts < 20);
        entries.push({ certId, row });
      }

      // Write in batches of 500 (Firestore limit)
      const BATCH_SIZE = 500;
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const chunk = entries.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        for (const { certId, row } of chunk) {
          const ref = doc(db, 'certificates', certId);
          batch.set(ref, {
            studentName: row.studentName,
            courseName: row.courseName,
            issueDate: row.issueDate || new Date().toISOString().split('T')[0],
            grade: row.grade || '',
            certificateId: certId,
            issuedBy: user?.email || 'Admin',
            createdAt: serverTimestamp()
          });
        }

        await batch.commit();
      }

      toast.success(`Successfully issued ${bulkData.length} certificates!`, { id: toastId });
      setShowBulkModal(false);
      setBulkData([]);
      fetchCertificates();
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error('Bulk upload failed. Some certificates may not have been created.', { id: toastId });
    } finally {
      setBulkUploading(false);
    }
  };

  const filteredData = certificates.filter(cert => 
    cert.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.certificateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.courseName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Award size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Certificate Generator</h1>
            <p className="text-slate-500 font-medium">Issue and manage verifiable digital credentials.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvParse}
            className="hidden"
            id="csv-upload"
          />
          <button 
            onClick={() => csvInputRef.current?.click()}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Upload size={20} />
            Bulk Upload (CSV)
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={20} />
            Issue Certificate
          </button>
        </div>
      </div>

      {/* Bulk Preview Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Upload size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Confirm Bulk Upload</h2>
                  <p className="text-xs font-medium text-slate-500">{bulkData.length} certificates will be issued.</p>
                </div>
              </div>
              <button onClick={() => { setShowBulkModal(false); setBulkData([]); }} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-auto flex-1 p-6">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                    <th className="p-3">#</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Course</th>
                    <th className="p-3">Issue Date</th>
                    <th className="p-3">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bulkData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{row.studentName}</td>
                      <td className="p-3 text-slate-600">{row.courseName}</td>
                      <td className="p-3 text-slate-500">{row.issueDate || 'Today'}</td>
                      <td className="p-3 text-slate-500">{row.grade || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                onClick={() => { setShowBulkModal(false); setBulkData([]); }}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                disabled={bulkUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkConfirm}
                disabled={bulkUploading}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {bulkUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Issuing...
                  </>
                ) : (
                  `Issue All ${bulkData.length} Certificates`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Award size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Issue New Certificate</h2>
                  <p className="text-xs font-medium text-slate-500">A unique ID will be auto-generated.</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleIssueCertificate} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Student Name <span className="text-rose-500">*</span></label>
                  <input 
                    type="text"
                    value={formData.studentName}
                    onChange={(e) => setFormData({...formData, studentName: e.target.value})}
                    placeholder="E.g. Rahul Kumar"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Gender</label>
                  <select 
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value as '' | 'Male' | 'Female'})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Student Email</label>
                <input 
                  type="email"
                  value={formData.studentEmail}
                  onChange={(e) => setFormData({...formData, studentEmail: e.target.value})}
                  placeholder="E.g. student@email.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Program / Course Name <span className="text-rose-500">*</span></label>
                  <input 
                    type="text"
                    value={formData.courseName}
                    onChange={(e) => setFormData({...formData, courseName: e.target.value})}
                    placeholder="E.g. Full-Stack Web Development"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Domain / Specialization</label>
                  <input 
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({...formData, domain: e.target.value})}
                    placeholder="E.g. Full Stack Web Development"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Start Date</label>
                  <input 
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">End Date</label>
                  <input 
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => { const v = e.target.value; setFormData({...formData, endDate: v, issueDate: v}); }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Issue Date <span className="text-rose-500">*</span></label>
                  <input 
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => { const v = e.target.value; setFormData({...formData, issueDate: v, endDate: v}); }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Grade (Optional)</label>
                  <input 
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({...formData, grade: e.target.value})}
                    placeholder="E.g. A+"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Marks %</label>
                  <input 
                    type="text"
                    value={formData.marksPercentage}
                    onChange={(e) => setFormData({...formData, marksPercentage: e.target.value})}
                    placeholder="E.g. 95"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Issuing...
                    </>
                  ) : (
                    'Issue Certificate'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by ID, name, or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-medium w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                <th className="p-4 pl-6">Certificate Details</th>
                <th className="p-4">Student</th>
                <th className="p-4">Issue Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">Loading certificates...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                      <Award size={32} />
                    </div>
                    <p className="text-slate-900 font-bold text-lg mb-1">No Certificates Found</p>
                    <p className="text-slate-500 text-sm">You haven't issued any certificates yet.</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 pl-6 align-top">
                      <div className="font-bold text-slate-900 mb-1">{cert.courseName}</div>
                      <div className="text-xs font-medium text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                        ID: {cert.id}
                      </div>
                      <div className="text-xs font-medium text-slate-400 mt-1">
                        Visual ID: {cert.certificateId}
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-bold text-slate-900">{cert.studentName}</div>
                      {cert.grade && (
                        <div className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md inline-block mt-1">
                          Grade: {cert.grade}
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-top">
                      <div className="text-sm font-medium text-slate-700">
                        {new Date(cert.issueDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 align-top text-center">
                      {cert.revoked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                          <X size={14} />
                          Revoked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 size={14} />
                          Valid
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setPreviewCert({
                              id: cert.id,
                              certificateId: cert.certificateId,
                              studentName: cert.studentName,
                              studentEmail: cert.studentEmail,
                              gender: cert.gender,
                              courseName: cert.courseName,
                              domain: cert.domain,
                              startDate: cert.startDate,
                              endDate: cert.endDate,
                              issueDate: cert.issueDate,
                              grade: cert.grade,
                              marksPercentage: cert.marksPercentage,
                            });
                            setShowPreview(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5"
                          title="Preview & Download Certificate"
                        >
                          <Eye size={18} />
                          <span className="text-xs font-bold hidden sm:inline-block">Preview</span>
                        </button>
                        <button 
                          onClick={() => copyVerificationLink(cert.certificateId)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5"
                          title="Copy Verification Link"
                        >
                          <Copy size={18} />
                          <span className="text-xs font-bold hidden sm:inline-block">Link</span>
                        </button>
                        {!cert.revoked ? (
                          <button 
                            onClick={() => handleRevoke(cert.id, cert.certificateId)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Revoke Certificate (Mark Invalid)"
                          >
                            <Ban size={18} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUnrevoke(cert.id, cert.certificateId)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1.5"
                            title="Restore Certificate (Mark Valid)"
                          >
                            <RotateCcw size={18} />
                            <span className="text-xs font-bold hidden sm:inline-block">Restore</span>
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeletePermanently(cert.id, cert.certificateId, cert.studentName)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Permanently"
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
      </div>

      {/* Certificate Preview Modal */}
      <CertificateModal
        isOpen={showPreview}
        onClose={() => { setShowPreview(false); setPreviewCert(null); }}
        certificate={previewCert}
      />
    </div>
  );
}
