import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  Video, 
  Upload, 
  Download, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Award, 
  School, 
  Users, 
  Calendar, 
  Filter, 
  X, 
  UserCheck, 
  FileSpreadsheet, 
  RefreshCw,
  Lock
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { logAdminActivity } from '../../utils/adminLogger';
import ConfirmModal from '../../components/admin/ConfirmModal';

export interface WebinarAttendee {
  id: string;
  studentName: string;
  email: string;
  phone?: string;
  collegeName?: string;
  branch?: string;
  yearOfStudy?: string;
  webinarTitle: string;
  webinarDate?: string;
  timestamp?: string;
  attendanceStatus: 'Attended' | 'Registered' | 'Absent';
  certificateIssued: boolean;
  certificateId?: string;
  source: 'google_form_csv' | 'manual';
  importedAt?: any;
  createdAt?: any;
}

// Robust CSV Line Parser handling quotes, commas, and linebreaks
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // handle CRLF
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Fuzzy Header Matching for Google Forms & Custom CSVs
function mapCSVHeaders(headers: string[]) {
  const normalized = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  
  const findIndex = (keywords: string[]) => {
    return normalized.findIndex(h => keywords.some(k => h.includes(k)));
  };

  return {
    timestamp: findIndex(['timestamp', 'submittedat', 'date', 'time']),
    name: findIndex(['name', 'studentname', 'fullname', 'yourname', 'participantname']),
    email: findIndex(['email', 'mail', 'emailaddress', 'studentemail']),
    phone: findIndex(['phone', 'whatsapp', 'mobile', 'contact', 'phonenumber']),
    college: findIndex(['college', 'institute', 'university', 'school', 'collegename']),
    branch: findIndex(['branch', 'department', 'stream', 'course', 'specialization']),
    year: findIndex(['year', 'semester', 'sem', 'yearofstudy', 'batch', 'class']),
    topic: findIndex(['webinar', 'topic', 'event', 'session', 'workshop', 'title']),
    attendance: findIndex(['attendance', 'status', 'attended', 'present']),
  };
}

export default function ManageWebinars() {
  const { user } = useAuth();
  const [attendees, setAttendees] = useState<WebinarAttendee[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWebinar, setSelectedWebinar] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Attended' | 'Registered' | 'Absent'>('All');
  const [selectedCollege, setSelectedCollege] = useState('All');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // CSV Import Modal & Preview
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [defaultWebinarTitle, setDefaultWebinarTitle] = useState('');
  const [defaultWebinarDate, setDefaultWebinarDate] = useState(new Date().toISOString().split('T')[0]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    studentName: '',
    email: '',
    phone: '',
    collegeName: '',
    branch: '',
    yearOfStudy: '',
    webinarTitle: '',
    webinarDate: new Date().toISOString().split('T')[0],
    attendanceStatus: 'Registered' as 'Attended' | 'Registered' | 'Absent',
  });
  const [isAdding, setIsAdding] = useState(false);

  // Confirm Modal state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'primary',
  });

  // Fetch attendees from Firestore
  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'webinar_attendees'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WebinarAttendee));
      setAttendees(list);
    } catch (err) {
      console.error('Error fetching webinar attendees:', err);
      toast.error('Failed to load webinar attendees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, []);

  // Compute unique webinars and colleges for filters
  const uniqueWebinars = useMemo(() => {
    const set = new Set<string>();
    attendees.forEach(a => {
      if (a.webinarTitle) set.add(a.webinarTitle);
    });
    return Array.from(set).sort();
  }, [attendees]);

  const uniqueColleges = useMemo(() => {
    const set = new Set<string>();
    attendees.forEach(a => {
      if (a.collegeName && a.collegeName !== 'N/A') set.add(a.collegeName);
    });
    return Array.from(set).sort();
  }, [attendees]);

  // Filter attendees
  const filteredAttendees = useMemo(() => {
    return attendees.filter(a => {
      const matchesSearch = 
        !searchTerm ||
        a.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.phone?.includes(searchTerm) ||
        a.collegeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.webinarTitle?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesWebinar = selectedWebinar === 'All' || a.webinarTitle === selectedWebinar;
      const matchesStatus = selectedStatus === 'All' || a.attendanceStatus === selectedStatus;
      const matchesCollege = selectedCollege === 'All' || a.collegeName === selectedCollege;

      return matchesSearch && matchesWebinar && matchesStatus && matchesCollege;
    });
  }, [attendees, searchTerm, selectedWebinar, selectedStatus, selectedCollege]);

  // Overall Stats
  const stats = useMemo(() => {
    const total = attendees.length;
    const attended = attendees.filter(a => a.attendanceStatus === 'Attended').length;
    const absent = attendees.filter(a => a.attendanceStatus === 'Absent').length;
    const registered = attendees.filter(a => a.attendanceStatus === 'Registered').length;
    const certCount = attendees.filter(a => a.certificateIssued).length;
    const collegesCount = uniqueColleges.length;
    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

    return { total, attended, absent, registered, certCount, collegesCount, attendanceRate };
  }, [attendees, uniqueColleges]);

  // Handle CSV File Selection
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCsvFileName(file.name);

      // Guess webinar title from file name if default is empty
      if (!defaultWebinarTitle) {
        const cleanName = file.name.replace(/\.csv$/i, '').replace(/[-_]/g, ' ');
        setDefaultWebinarTitle(cleanName);
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;

        const rows = parseCSV(text);
        if (rows.length < 2) {
          toast.error('The uploaded CSV is empty or missing headers.');
          return;
        }

        const headers = rows[0];
        const headerMap = mapCSVHeaders(headers);

        if (headerMap.name === -1 && headerMap.email === -1) {
          toast.error('Could not detect Name or Email column. Please verify CSV format.');
        }

        const parsed: any[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || row.every(c => !c)) continue;

          const studentName = headerMap.name !== -1 ? (row[headerMap.name] || 'Participant') : (row[0] || 'Participant');
          const email = headerMap.email !== -1 ? (row[headerMap.email] || '') : (row[1] || '');
          const phone = headerMap.phone !== -1 ? row[headerMap.phone] : '';
          const college = headerMap.college !== -1 ? row[headerMap.college] : '';
          const branch = headerMap.branch !== -1 ? row[headerMap.branch] : '';
          const year = headerMap.year !== -1 ? row[headerMap.year] : '';
          const topic = headerMap.topic !== -1 ? row[headerMap.topic] : '';
          const timestamp = headerMap.timestamp !== -1 ? row[headerMap.timestamp] : '';

          let attendanceStatus: 'Attended' | 'Registered' | 'Absent' = 'Registered';
          if (headerMap.attendance !== -1 && row[headerMap.attendance]) {
            const val = row[headerMap.attendance].toLowerCase();
            if (val.includes('yes') || val.includes('present') || val.includes('attend')) {
              attendanceStatus = 'Attended';
            } else if (val.includes('absent') || val.includes('no')) {
              attendanceStatus = 'Absent';
            }
          }

          if (studentName || email) {
            parsed.push({
              studentName: studentName.trim(),
              email: email.trim().toLowerCase(),
              phone: phone.trim(),
              collegeName: college.trim() || 'N/A',
              branch: branch.trim() || 'N/A',
              yearOfStudy: year.trim() || 'N/A',
              webinarTitle: topic.trim() || '',
              timestamp: timestamp.trim() || new Date().toISOString(),
              attendanceStatus,
            });
          }
        }

        setParsedRows(parsed);
        setShowImportModal(true);
      };
      reader.readAsText(file);
    }
  };

  // Submit parsed CSV to Firestore in batches
  const handleConfirmImport = async () => {
    if (!parsedRows.length) {
      toast.error('No valid rows found to import.');
      return;
    }

    const finalTopic = defaultWebinarTitle.trim() || 'Tech Career & AI Webinar';
    setImporting(true);
    const toastId = toast.loading(`Importing ${parsedRows.length} attendees...`);

    try {
      // Chunk into batches of 450 (Firestore limit is 500 operations per batch)
      const chunkSize = 400;
      for (let i = 0; i < parsedRows.length; i += chunkSize) {
        const chunk = parsedRows.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach(item => {
          const docRef = doc(collection(db, 'webinar_attendees'));
          batch.set(docRef, {
            studentName: item.studentName,
            email: item.email,
            phone: item.phone,
            collegeName: item.collegeName,
            branch: item.branch,
            yearOfStudy: item.yearOfStudy,
            webinarTitle: item.webinarTitle || finalTopic,
            webinarDate: defaultWebinarDate,
            timestamp: item.timestamp,
            attendanceStatus: item.attendanceStatus,
            certificateIssued: false,
            source: 'google_form_csv',
            importedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          });
        });

        await batch.commit();
      }

      await logAdminActivity(
        user?.email,
        'BULK_ACTION',
        `Webinar: ${finalTopic}`,
        `Imported ${parsedRows.length} attendees via Google Form CSV (${csvFileName})`
      );

      toast.success(`Successfully imported ${parsedRows.length} attendees!`, { id: toastId });
      setShowImportModal(false);
      setParsedRows([]);
      setCsvFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchAttendees();
    } catch (err) {
      console.error('Error importing attendees:', err);
      toast.error('Failed to import CSV records', { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  // Download Sample Google Form CSV
  const downloadSampleCSV = () => {
    const headers = ["Timestamp", "Full Name", "Email Address", "WhatsApp / Phone", "College / Institute", "Branch / Stream", "Year / Semester", "Webinar Topic"];
    const sampleRows = [
      ["2026/08/17 10:15:00 AM", "Rahul Sharma", "rahul.sharma@example.com", "9876543210", "MIT Muzaffarpur", "CSE", "3rd Year", "AI & Full-Stack Career Roadmap"],
      ["2026/08/17 10:18:22 AM", "Priya Kumari", "priya.k@example.com", "9876543211", "Purnea College", "BCA", "2nd Year", "AI & Full-Stack Career Roadmap"],
      ["2026/08/17 10:24:45 AM", "Amit Verma", "amit.verma@example.com", "9876543212", "BCE Bhagalpur", "ECE", "4th Year", "AI & Full-Stack Career Roadmap"]
    ];

    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers.join(","), ...sampleRows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "google_form_webinar_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Filtered Attendees to CSV
  const exportAttendeesCSV = () => {
    if (!filteredAttendees.length) {
      toast.error('No attendee records to export');
      return;
    }

    const headers = ["Student Name", "Email", "Phone", "College", "Branch", "Year", "Webinar Title", "Webinar Date", "Attendance Status", "Certificate Issued", "Registered Date"];
    const rows = filteredAttendees.map(a => [
      a.studentName,
      a.email,
      a.phone || '',
      a.collegeName || '',
      a.branch || '',
      a.yearOfStudy || '',
      a.webinarTitle,
      a.webinarDate || '',
      a.attendanceStatus,
      a.certificateIssued ? "Yes" : "No",
      a.timestamp || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers.join(","), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `webinar_attendees_${selectedWebinar === 'All' ? 'all' : selectedWebinar.replace(/[^a-z0-9]/gi, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredAttendees.length} records to CSV`);
  };

  // Toggle Attendance Status
  const handleToggleAttendance = async (attendee: WebinarAttendee) => {
    const nextStatus: 'Attended' | 'Registered' | 'Absent' = 
      attendee.attendanceStatus === 'Registered' ? 'Attended' :
      attendee.attendanceStatus === 'Attended' ? 'Absent' : 'Registered';

    try {
      await updateDoc(doc(db, 'webinar_attendees', attendee.id), {
        attendanceStatus: nextStatus,
        updatedAt: serverTimestamp(),
      });
      setAttendees(prev => prev.map(a => a.id === attendee.id ? { ...a, attendanceStatus: nextStatus } : a));
      toast.success(`${attendee.studentName} marked as ${nextStatus}`);
    } catch (err) {
      console.error('Error updating attendance:', err);
      toast.error('Failed to update attendance');
    }
  };

  // Toggle Certificate Issued Flag
  const handleToggleCertificate = async (attendee: WebinarAttendee) => {
    const nextVal = !attendee.certificateIssued;
    try {
      await updateDoc(doc(db, 'webinar_attendees', attendee.id), {
        certificateIssued: nextVal,
        updatedAt: serverTimestamp(),
      });
      setAttendees(prev => prev.map(a => a.id === attendee.id ? { ...a, certificateIssued: nextVal } : a));
      toast.success(`Certificate ${nextVal ? 'marked as Issued' : 'revoked'}`);
    } catch (err) {
      console.error('Error updating certificate status:', err);
      toast.error('Failed to update status');
    }
  };

  // Delete Single Attendee
  const handleDeleteAttendee = (attendee: WebinarAttendee) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Delete Webinar Attendee',
      message: `Are you sure you want to remove ${attendee.studentName} (${attendee.email}) from "${attendee.webinarTitle}"? This cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'webinar_attendees', attendee.id));
          setAttendees(prev => prev.filter(a => a.id !== attendee.id));
          setSelectedIds(prev => prev.filter(id => id !== attendee.id));
          await logAdminActivity(user?.email, 'DELETED', `Webinar Attendee: ${attendee.studentName}`, attendee.email);
          toast.success('Attendee removed successfully');
        } catch (err) {
          console.error('Error deleting attendee:', err);
          toast.error('Failed to delete attendee');
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Bulk Actions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredAttendees.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectId = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBulkMarkAttended = async () => {
    if (!selectedIds.length) return;
    const toastId = toast.loading(`Marking ${selectedIds.length} as Attended...`);

    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, 'webinar_attendees', id), {
          attendanceStatus: 'Attended',
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();

      setAttendees(prev => prev.map(a => selectedIds.includes(a.id) ? { ...a, attendanceStatus: 'Attended' } : a));
      toast.success(`Marked ${selectedIds.length} attendees as Present/Attended!`, { id: toastId });
      setSelectedIds([]);
    } catch (err) {
      console.error('Error bulk updating attendance:', err);
      toast.error('Failed to update records', { id: toastId });
    }
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    setConfirmModalState({
      isOpen: true,
      title: 'Bulk Delete Attendees',
      message: `Are you sure you want to delete ${selectedIds.length} attendee records? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        const toastId = toast.loading(`Deleting ${selectedIds.length} records...`);
        try {
          const batch = writeBatch(db);
          selectedIds.forEach(id => {
            batch.delete(doc(db, 'webinar_attendees', id));
          });
          await batch.commit();

          setAttendees(prev => prev.filter(a => !selectedIds.includes(a.id)));
          setSelectedIds([]);
          toast.success('Selected attendees deleted successfully', { id: toastId });
        } catch (err) {
          console.error('Error bulk deleting:', err);
          toast.error('Failed to delete records', { id: toastId });
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Add Attendee Manually
  const handleAddManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.studentName.trim() || !addFormData.email.trim() || !addFormData.webinarTitle.trim()) {
      toast.error('Please provide Student Name, Email, and Webinar Title');
      return;
    }

    setIsAdding(true);
    const toastId = toast.loading('Adding attendee...');

    try {
      const newDoc = await addDoc(collection(db, 'webinar_attendees'), {
        studentName: addFormData.studentName.trim(),
        email: addFormData.email.trim().toLowerCase(),
        phone: addFormData.phone.trim(),
        collegeName: addFormData.collegeName.trim() || 'N/A',
        branch: addFormData.branch.trim() || 'N/A',
        yearOfStudy: addFormData.yearOfStudy.trim() || 'N/A',
        webinarTitle: addFormData.webinarTitle.trim(),
        webinarDate: addFormData.webinarDate,
        timestamp: new Date().toISOString(),
        attendanceStatus: addFormData.attendanceStatus,
        certificateIssued: false,
        source: 'manual',
        createdAt: serverTimestamp(),
      });

      setAttendees(prev => [{
        id: newDoc.id,
        studentName: addFormData.studentName.trim(),
        email: addFormData.email.trim().toLowerCase(),
        phone: addFormData.phone.trim(),
        collegeName: addFormData.collegeName.trim() || 'N/A',
        branch: addFormData.branch.trim() || 'N/A',
        yearOfStudy: addFormData.yearOfStudy.trim() || 'N/A',
        webinarTitle: addFormData.webinarTitle.trim(),
        webinarDate: addFormData.webinarDate,
        attendanceStatus: addFormData.attendanceStatus,
        certificateIssued: false,
        source: 'manual',
      }, ...prev]);

      toast.success('Attendee registered successfully!', { id: toastId });
      setShowAddModal(false);
      setAddFormData({
        studentName: '',
        email: '',
        phone: '',
        collegeName: '',
        branch: '',
        yearOfStudy: '',
        webinarTitle: '',
        webinarDate: new Date().toISOString().split('T')[0],
        attendanceStatus: 'Registered',
      });
    } catch (err) {
      console.error('Error adding attendee:', err);
      toast.error('Failed to add attendee', { id: toastId });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Hidden File Input for CSV */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleCSVFileChange} 
        accept=".csv,text/csv" 
        className="hidden" 
      />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
              <Video size={14} /> Private Webinars
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <Lock size={12} /> Admin Only • Hidden from Public Website
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Webinar Registrations &amp; CSV Importer
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Import student Google Form response sheets, track live session attendance, and manage webinar certificates.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowFormatGuide(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs active:scale-95"
            title="View CSV Header Format"
          >
            <HelpCircle size={16} className="text-purple-600" />
            <span>CSV Format</span>
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-purple-600/20 cursor-pointer active:scale-95"
          >
            <Upload size={16} />
            <span>Import Google Form CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            <span>Add Single</span>
          </button>

          <button
            onClick={exportAttendeesCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
            title="Export list to CSV"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Registered</span>
            <Users size={18} className="text-purple-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.total}</p>
          <p className="text-[11px] font-medium text-slate-500">Across all private sessions</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Attended Live</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{stats.attended}</p>
          <p className="text-[11px] font-bold text-emerald-700">{stats.attendanceRate}% Attendance Rate</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Absent / Pending</span>
            <XCircle size={18} className="text-rose-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-600">{stats.absent + stats.registered}</p>
          <p className="text-[11px] font-medium text-slate-500">{stats.registered} registered, {stats.absent} absent</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Colleges</span>
            <School size={18} className="text-indigo-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.collegesCount}</p>
          <p className="text-[11px] font-medium text-slate-500">Unique colleges reached</p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Certificates</span>
            <Award size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">{stats.certCount}</p>
          <p className="text-[11px] font-medium text-slate-500">Issued to participants</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by student name, email, phone, college, or webinar title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/50"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Webinar Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium">
              <Video size={14} className="text-slate-400 shrink-0" />
              <select
                value={selectedWebinar}
                onChange={(e) => setSelectedWebinar(e.target.value)}
                className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="All">All Webinars ({uniqueWebinars.length})</option>
                {uniqueWebinars.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            {/* Attendance Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Attended">Attended (Present)</option>
                <option value="Registered">Registered (Pending)</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

            {/* College Filter */}
            {uniqueColleges.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium">
                <School size={14} className="text-slate-400 shrink-0" />
                <select
                  value={selectedCollege}
                  onChange={(e) => setSelectedCollege(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer max-w-[150px] truncate"
                >
                  <option value="All">All Colleges</option>
                  {uniqueColleges.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={fetchAttendees}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Refresh list"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Bulk Action Controls Bar */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between gap-3 flex-wrap animate-in fade-in">
            <span className="text-xs font-bold text-purple-900">
              {selectedIds.length} attendees selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkMarkAttended}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs active:scale-95"
              >
                <UserCheck size={14} />
                <span>Mark as Attended</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs active:scale-95"
              >
                <Trash2 size={14} />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attendees Table / Mobile Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-500">Loading webinar records...</p>
          </div>
        ) : filteredAttendees.length === 0 ? (
          <div className="py-16 px-4 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Video size={28} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">No Attendees Found</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">
              {attendees.length === 0 
                ? 'No webinar attendees registered yet. Import a Google Form CSV or add students manually.' 
                : 'No attendees match your current search and filter settings.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-md"
              >
                <Upload size={15} />
                <span>Import CSV</span>
              </button>
              <button
                onClick={() => setShowFormatGuide(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                <HelpCircle size={15} />
                <span>View CSV Format</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredAttendees.length && filteredAttendees.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-4">Student &amp; Contact</th>
                    <th className="p-4">College &amp; Branch</th>
                    <th className="p-4">Webinar Topic &amp; Date</th>
                    <th className="p-4">Attendance</th>
                    <th className="p-4">Certificate</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredAttendees.map((attendee) => {
                    const isSelected = selectedIds.includes(attendee.id);
                    return (
                      <tr key={attendee.id} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-purple-50/40' : ''}`}>
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectId(attendee.id)}
                            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-extrabold text-slate-900 text-sm">{attendee.studentName}</div>
                          <div className="text-slate-500 font-mono text-[11px]">{attendee.email}</div>
                          {attendee.phone && <div className="text-slate-400 text-[11px]">{attendee.phone}</div>}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800 flex items-center gap-1">
                            <School size={13} className="text-indigo-500 shrink-0" />
                            <span>{attendee.collegeName}</span>
                          </div>
                          {(attendee.branch !== 'N/A' || attendee.yearOfStudy !== 'N/A') && (
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              {attendee.branch} {attendee.yearOfStudy ? `• ${attendee.yearOfStudy}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-purple-900">{attendee.webinarTitle}</div>
                          {attendee.webinarDate && (
                            <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                              <Calendar size={12} />
                              <span>{attendee.webinarDate}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleAttendance(attendee)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                              attendee.attendanceStatus === 'Attended'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : attendee.attendanceStatus === 'Absent'
                                ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            title="Click to toggle status (Attended -> Absent -> Registered)"
                          >
                            {attendee.attendanceStatus === 'Attended' && <CheckCircle2 size={13} />}
                            {attendee.attendanceStatus === 'Absent' && <XCircle size={13} />}
                            <span>{attendee.attendanceStatus}</span>
                          </button>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleCertificate(attendee)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                              attendee.certificateIssued
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title="Click to toggle certificate issued flag"
                          >
                            <Award size={13} />
                            <span>{attendee.certificateIssued ? 'Issued' : 'Not Issued'}</span>
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteAttendee(attendee)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredAttendees.map((attendee) => {
                const isSelected = selectedIds.includes(attendee.id);
                return (
                  <div key={attendee.id} className={`p-4 space-y-3 ${isSelected ? 'bg-purple-50/40' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectId(attendee.id)}
                          className="w-4 h-4 mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">{attendee.studentName}</h4>
                          <p className="text-slate-500 font-mono text-xs">{attendee.email}</p>
                          {attendee.phone && <p className="text-slate-400 text-xs">{attendee.phone}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAttendee(attendee)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1 text-slate-700">
                      <p className="font-bold text-purple-900">{attendee.webinarTitle}</p>
                      <p className="text-slate-500 flex items-center gap-1">
                        <School size={12} />
                        <span>{attendee.collegeName}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        onClick={() => handleToggleAttendance(attendee)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold ${
                          attendee.attendanceStatus === 'Attended'
                            ? 'bg-emerald-100 text-emerald-800'
                            : attendee.attendanceStatus === 'Absent'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {attendee.attendanceStatus === 'Attended' && <CheckCircle2 size={13} />}
                        {attendee.attendanceStatus === 'Absent' && <XCircle size={13} />}
                        <span>Status: {attendee.attendanceStatus}</span>
                      </button>

                      <button
                        onClick={() => handleToggleCertificate(attendee)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold ${
                          attendee.certificateIssued
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Award size={13} />
                        <span>Cert: {attendee.certificateIssued ? 'Issued' : 'Pending'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* CSV FORMAT & GOOGLE FORM GUIDE MODAL */}
      {showFormatGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[92dvh] flex flex-col border border-gray-100 my-auto">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 font-bold">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Google Form CSV Format Specification</h2>
                  <p className="text-xs text-slate-500 font-medium">How to download and import Google Form responses</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFormatGuide(false)} 
                className="p-2 hover:bg-slate-200/80 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-none space-y-5 text-xs sm:text-sm">
              <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100 space-y-2">
                <h4 className="font-extrabold text-purple-900 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-purple-600" />
                  How to export from Google Forms:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 text-xs sm:text-sm">
                  <li>Open your Google Form &rarr; Click on the <strong>Responses</strong> tab.</li>
                  <li>Click the 3 vertical dots (<strong>&vellip;</strong>) next to the Google Sheets icon.</li>
                  <li>Select <strong>Download responses (.csv)</strong>.</li>
                  <li>Click <strong>Import Google Form CSV</strong> button on this page and select the file.</li>
                </ol>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 mb-2">Supported Column Header Names (Case-Insensitive)</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="p-2.5">Field</th>
                        <th className="p-2.5">Supported Header Keywords</th>
                        <th className="p-2.5">Required?</th>
                        <th className="p-2.5">Sample Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="p-2.5 font-bold">Student Name</td>
                        <td className="p-2.5 font-mono text-[11px] text-purple-700">Name, Full Name, Student Name, What is your name?</td>
                        <td className="p-2.5 text-rose-600 font-bold">Required</td>
                        <td className="p-2.5">Rahul Sharma</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">Email Address</td>
                        <td className="p-2.5 font-mono text-[11px] text-purple-700">Email, Email Address, Student Email, Mail</td>
                        <td className="p-2.5 text-rose-600 font-bold">Required</td>
                        <td className="p-2.5">rahul@example.com</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">Phone Number</td>
                        <td className="p-2.5 font-mono text-[11px] text-purple-700">Phone, WhatsApp, Phone Number, Mobile Number</td>
                        <td className="p-2.5 text-slate-500 font-medium">Optional</td>
                        <td className="p-2.5">+91 9876543210</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">College / Institute</td>
                        <td className="p-2.5 font-mono text-[11px] text-purple-700">College, College Name, Institute, University, School</td>
                        <td className="p-2.5 text-slate-500 font-medium">Optional</td>
                        <td className="p-2.5">MIT Muzaffarpur</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">Branch / Stream</td>
                        <td className="p-2.5 font-mono text-[11px] text-purple-700">Branch, Department, Stream, Course, Specialization</td>
                        <td className="p-2.5 text-slate-500 font-medium">Optional</td>
                        <td className="p-2.5">Computer Science</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">Year / Semester</td>
                        <td className="p-2.5 font-mono text-[11px] text-purple-700">Year, Semester, Year of Study, Batch, Class</td>
                        <td className="p-2.5 text-slate-500 font-medium">Optional</td>
                        <td className="p-2.5">3rd Year (6th Sem)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">Webinar Topic</td>
                        <td className="p-2.5 font-mono text-[11px] text-purple-700">Webinar, Topic, Event, Session, Title</td>
                        <td className="p-2.5 text-slate-500 font-medium">Optional*</td>
                        <td className="p-2.5">AI &amp; Career Roadmap</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">Timestamp</td>
                        <td className="p-2.5 font-mono text-[11px] text-purple-700">Timestamp, Date, Submitted At</td>
                        <td className="p-2.5 text-slate-500 font-medium">Optional</td>
                        <td className="p-2.5">2026/08/17 4:30 PM</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 italic">
                  * If your CSV does not include a "Webinar Topic" column, you can set the Topic Title during the import preview screen.
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={downloadSampleCSV}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <Download size={15} />
                <span>Download Sample CSV</span>
              </button>
              <button
                onClick={() => setShowFormatGuide(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV PREVIEW & IMPORT CONFIRMATION MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[92dvh] flex flex-col border border-gray-100 my-auto">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Preview &amp; Confirm CSV Import</h2>
                  <p className="text-xs text-slate-500 font-medium">Found {parsedRows.length} attendee records in {csvFileName}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-2 hover:bg-slate-200/80 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-none space-y-4 text-xs sm:text-sm">
              {/* Global Default Topic & Date Configuration */}
              <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-purple-900 mb-1">
                    Default Webinar Title / Topic <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={defaultWebinarTitle}
                    onChange={(e) => setDefaultWebinarTitle(e.target.value)}
                    placeholder="e.g. Masterclass on Full-Stack AI 2026"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-bold text-slate-900 text-xs sm:text-base"
                  />
                  <p className="text-[11px] text-purple-700 mt-0.5">Applied to all imported rows without a specific topic.</p>
                </div>

                <div>
                  <label className="block font-bold text-purple-900 mb-1">
                    Webinar Conducted Date
                  </label>
                  <input
                    type="date"
                    value={defaultWebinarDate}
                    onChange={(e) => setDefaultWebinarDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-medium text-slate-900 text-xs sm:text-base"
                  />
                </div>
              </div>

              {/* Preview Table */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Parsed Records Preview ({parsedRows.length})</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px] sticky top-0 bg-slate-50">
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">Phone</th>
                        <th className="p-2.5">College</th>
                        <th className="p-2.5">Branch / Year</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-900">{row.studentName}</td>
                          <td className="p-2.5 font-mono text-slate-600">{row.email}</td>
                          <td className="p-2.5 text-slate-500">{row.phone || '—'}</td>
                          <td className="p-2.5 text-slate-700">{row.collegeName}</td>
                          <td className="p-2.5 text-slate-500">{row.branch} {row.yearOfStudy ? `(${row.yearOfStudy})` : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 50 && (
                  <p className="text-[11px] text-slate-400 mt-1 italic text-center">
                    Showing first 50 rows of {parsedRows.length} total records.
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-gray-200 hover:bg-slate-100 transition-colors text-xs sm:text-sm cursor-pointer"
                disabled={importing}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing || !defaultWebinarTitle.trim()}
                className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs sm:text-sm hover:bg-purple-700 transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload size={15} />
                    <span>Confirm &amp; Import {parsedRows.length} Attendees</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL ADD ATTENDEE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92dvh] flex flex-col border border-gray-100 my-auto">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Plus size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Add Webinar Attendee</h2>
                  <p className="text-xs text-slate-500 font-medium">Manually register a student for a webinar</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-200/80 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddManualSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-none space-y-3.5 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Student Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={addFormData.studentName}
                    onChange={(e) => setAddFormData({ ...addFormData, studentName: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address <span className="text-rose-500">*</span></label>
                    <input
                      type="email"
                      required
                      value={addFormData.email}
                      onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                      placeholder="e.g. rahul@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone / WhatsApp</label>
                    <input
                      type="tel"
                      value={addFormData.phone}
                      onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">College / Institute Name</label>
                  <input
                    type="text"
                    value={addFormData.collegeName}
                    onChange={(e) => setAddFormData({ ...addFormData, collegeName: e.target.value })}
                    placeholder="e.g. MIT Muzaffarpur / Purnea College"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Branch / Stream</label>
                    <input
                      type="text"
                      value={addFormData.branch}
                      onChange={(e) => setAddFormData({ ...addFormData, branch: e.target.value })}
                      placeholder="e.g. CSE / BCA"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Year / Semester</label>
                    <input
                      type="text"
                      value={addFormData.yearOfStudy}
                      onChange={(e) => setAddFormData({ ...addFormData, yearOfStudy: e.target.value })}
                      placeholder="e.g. 3rd Year"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Webinar Topic / Title <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={addFormData.webinarTitle}
                    onChange={(e) => setAddFormData({ ...addFormData, webinarTitle: e.target.value })}
                    placeholder="e.g. Full-Stack AI & Cloud Bootcamp"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Webinar Date</label>
                    <input
                      type="date"
                      value={addFormData.webinarDate}
                      onChange={(e) => setAddFormData({ ...addFormData, webinarDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Initial Status</label>
                    <select
                      value={addFormData.attendanceStatus}
                      onChange={(e) => setAddFormData({ ...addFormData, attendanceStatus: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-bold bg-white"
                    >
                      <option value="Registered">Registered (Pending)</option>
                      <option value="Attended">Attended (Present)</option>
                      <option value="Absent">Absent</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-gray-200 hover:bg-slate-100 transition-colors text-xs sm:text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs sm:text-sm hover:bg-purple-700 transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {isAdding ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Add Attendee'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        variant={confirmModalState.variant}
      />
    </div>
  );
}
