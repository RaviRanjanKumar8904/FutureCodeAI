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
  Lock,
  ArrowLeft,
  Edit,
  ExternalLink,
  Clock,
  User
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { logAdminActivity } from '../../utils/adminLogger';
import ConfirmModal from '../../components/admin/ConfirmModal';

export interface WebinarItem {
  id: string;
  title: string;
  topic?: string;
  speaker?: string;
  date: string;
  time?: string;
  meetingLink?: string;
  formLink?: string;
  status: 'Upcoming' | 'Live' | 'Completed';
  createdAt?: any;
}

export interface WebinarAttendee {
  id: string;
  webinarId?: string;
  webinarTitle: string;
  studentName: string;
  email: string;
  phone?: string;
  collegeName?: string;
  branch?: string;
  yearOfStudy?: string;
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
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
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
  
  // Webinars and Attendees State
  const [webinars, setWebinars] = useState<WebinarItem[]>([]);
  const [attendees, setAttendees] = useState<WebinarAttendee[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Selected Webinar (Drill-Down Mode)
  const [selectedWebinar, setSelectedWebinar] = useState<WebinarItem | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Attended' | 'Registered' | 'Absent'>('All');
  const [selectedCollege, setSelectedCollege] = useState('All');
  const [webinarStatusFilter, setWebinarStatusFilter] = useState<'All' | 'Upcoming' | 'Live' | 'Completed'>('All');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Create / Edit Webinar Modal
  const [showWebinarModal, setShowWebinarModal] = useState(false);
  const [editingWebinar, setEditingWebinar] = useState<WebinarItem | null>(null);
  const [webinarFormData, setWebinarFormData] = useState({
    title: '',
    topic: '',
    speaker: '',
    date: new Date().toISOString().split('T')[0],
    time: '05:00 PM - 06:30 PM',
    meetingLink: '',
    formLink: '',
    status: 'Upcoming' as 'Upcoming' | 'Live' | 'Completed',
  });
  const [isSavingWebinar, setIsSavingWebinar] = useState(false);

  // CSV Import Modal & Preview
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [targetWebinarId, setTargetWebinarId] = useState<string>('');
  const [targetWebinarTitle, setTargetWebinarTitle] = useState<string>('');
  const [targetWebinarDate, setTargetWebinarDate] = useState<string>(new Date().toISOString().split('T')[0]);
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
    webinarId: '',
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

  // Fetch all webinars and attendees
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Webinars
      const webinarsSnap = await getDocs(query(collection(db, 'webinars'), orderBy('createdAt', 'desc')));
      const webinarsList = webinarsSnap.docs.map(d => ({ id: d.id, ...d.data() } as WebinarItem));
      setWebinars(webinarsList);

      // 2. Fetch Attendees
      const attendeesSnap = await getDocs(query(collection(db, 'webinar_attendees'), orderBy('createdAt', 'desc')));
      const attendeesList = attendeesSnap.docs.map(d => ({ id: d.id, ...d.data() } as WebinarAttendee));
      setAttendees(attendeesList);
    } catch (err) {
      console.error('Error fetching webinars data:', err);
      toast.error('Failed to load webinar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute metrics per webinar
  const webinarMetrics = useMemo(() => {
    const map = new Map<string, { total: number; attended: number; absent: number; registered: number; certCount: number; colleges: Set<string> }>();
    
    webinars.forEach(w => {
      map.set(w.id, { total: 0, attended: 0, absent: 0, registered: 0, certCount: 0, colleges: new Set() });
    });

    attendees.forEach(a => {
      // match by webinarId or fallback to webinarTitle
      let wid = a.webinarId;
      if (!wid) {
        const found = webinars.find(w => w.title.toLowerCase() === a.webinarTitle?.toLowerCase());
        if (found) wid = found.id;
      }

      if (wid && map.has(wid)) {
        const stats = map.get(wid)!;
        stats.total++;
        if (a.attendanceStatus === 'Attended') stats.attended++;
        else if (a.attendanceStatus === 'Absent') stats.absent++;
        else stats.registered++;
        if (a.certificateIssued) stats.certCount++;
        if (a.collegeName && a.collegeName !== 'N/A') stats.colleges.add(a.collegeName);
      }
    });

    return map;
  }, [webinars, attendees]);

  // Overall Global Stats
  const globalStats = useMemo(() => {
    const totalWebinars = webinars.length;
    const totalStudents = attendees.length;
    const totalAttended = attendees.filter(a => a.attendanceStatus === 'Attended').length;
    const totalCertificates = attendees.filter(a => a.certificateIssued).length;
    const rate = totalStudents > 0 ? Math.round((totalAttended / totalStudents) * 100) : 0;
    return { totalWebinars, totalStudents, totalAttended, totalCertificates, rate };
  }, [webinars, attendees]);

  // Filtered Attendees for Selected Webinar
  const attendeesForSelectedWebinar = useMemo(() => {
    if (!selectedWebinar) return attendees;
    return attendees.filter(a => {
      if (a.webinarId && a.webinarId === selectedWebinar.id) return true;
      if (a.webinarTitle && a.webinarTitle.toLowerCase() === selectedWebinar.title.toLowerCase()) return true;
      return false;
    });
  }, [attendees, selectedWebinar]);

  // Unique colleges for current view
  const uniqueColleges = useMemo(() => {
    const list = selectedWebinar ? attendeesForSelectedWebinar : attendees;
    const set = new Set<string>();
    list.forEach(a => {
      if (a.collegeName && a.collegeName !== 'N/A') set.add(a.collegeName);
    });
    return Array.from(set).sort();
  }, [selectedWebinar, attendeesForSelectedWebinar, attendees]);

  // Filtered list of attendees based on search & filter inputs
  const displayedAttendees = useMemo(() => {
    const baseList = selectedWebinar ? attendeesForSelectedWebinar : attendees;
    return baseList.filter(a => {
      const matchesSearch = 
        !searchTerm ||
        a.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.phone?.includes(searchTerm) ||
        a.collegeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.webinarTitle?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === 'All' || a.attendanceStatus === selectedStatus;
      const matchesCollege = selectedCollege === 'All' || a.collegeName === selectedCollege;

      return matchesSearch && matchesStatus && matchesCollege;
    });
  }, [selectedWebinar, attendeesForSelectedWebinar, attendees, searchTerm, selectedStatus, selectedCollege]);

  // Filtered Webinars for the main dashboard
  const filteredWebinars = useMemo(() => {
    return webinars.filter(w => {
      const matchesSearch = 
        !searchTerm ||
        w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.speaker?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = webinarStatusFilter === 'All' || w.status === webinarStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [webinars, searchTerm, webinarStatusFilter]);

  // Stats for currently selected webinar
  const selectedWebinarStats = useMemo(() => {
    if (!selectedWebinar) return null;
    const metrics = webinarMetrics.get(selectedWebinar.id) || { total: 0, attended: 0, absent: 0, registered: 0, certCount: 0, colleges: new Set() };
    const rate = metrics.total > 0 ? Math.round((metrics.attended / metrics.total) * 100) : 0;
    return { ...metrics, rate };
  }, [selectedWebinar, webinarMetrics]);

  // -------------------------------------------------------------
  // WEBINAR CRUD HANDLERS
  // -------------------------------------------------------------
  const handleOpenCreateWebinar = () => {
    setEditingWebinar(null);
    setWebinarFormData({
      title: '',
      topic: '',
      speaker: '',
      date: new Date().toISOString().split('T')[0],
      time: '05:00 PM - 06:30 PM',
      meetingLink: '',
      formLink: '',
      status: 'Upcoming',
    });
    setShowWebinarModal(true);
  };

  const handleOpenEditWebinar = (webinar: WebinarItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingWebinar(webinar);
    setWebinarFormData({
      title: webinar.title,
      topic: webinar.topic || '',
      speaker: webinar.speaker || '',
      date: webinar.date || new Date().toISOString().split('T')[0],
      time: webinar.time || '',
      meetingLink: webinar.meetingLink || '',
      formLink: webinar.formLink || '',
      status: webinar.status || 'Upcoming',
    });
    setShowWebinarModal(true);
  };

  const handleSaveWebinar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webinarFormData.title.trim() || !webinarFormData.date) {
      toast.error('Please provide at least a Webinar Title and Date.');
      return;
    }

    setIsSavingWebinar(true);
    const toastId = toast.loading(editingWebinar ? 'Updating webinar...' : 'Creating webinar...');

    try {
      if (editingWebinar) {
        await updateDoc(doc(db, 'webinars', editingWebinar.id), {
          title: webinarFormData.title.trim(),
          topic: webinarFormData.topic.trim(),
          speaker: webinarFormData.speaker.trim(),
          date: webinarFormData.date,
          time: webinarFormData.time.trim(),
          meetingLink: webinarFormData.meetingLink.trim(),
          formLink: webinarFormData.formLink.trim(),
          status: webinarFormData.status,
          updatedAt: serverTimestamp(),
        });

        setWebinars(prev => prev.map(w => w.id === editingWebinar.id ? { ...w, ...webinarFormData } : w));
        if (selectedWebinar?.id === editingWebinar.id) {
          setSelectedWebinar({ ...selectedWebinar, ...webinarFormData });
        }
        await logAdminActivity(user?.email, 'UPDATED', `Webinar: ${webinarFormData.title}`);
        toast.success('Webinar updated successfully!', { id: toastId });
      } else {
        const newDoc = await addDoc(collection(db, 'webinars'), {
          title: webinarFormData.title.trim(),
          topic: webinarFormData.topic.trim(),
          speaker: webinarFormData.speaker.trim(),
          date: webinarFormData.date,
          time: webinarFormData.time.trim(),
          meetingLink: webinarFormData.meetingLink.trim(),
          formLink: webinarFormData.formLink.trim(),
          status: webinarFormData.status,
          createdAt: serverTimestamp(),
        });

        const createdItem: WebinarItem = {
          id: newDoc.id,
          ...webinarFormData,
        };
        setWebinars(prev => [createdItem, ...prev]);
        await logAdminActivity(user?.email, 'CREATED', `Webinar: ${webinarFormData.title}`);
        toast.success('Webinar created successfully!', { id: toastId });
      }
      setShowWebinarModal(false);
    } catch (err) {
      console.error('Error saving webinar:', err);
      toast.error('Failed to save webinar', { id: toastId });
    } finally {
      setIsSavingWebinar(false);
    }
  };

  const handleDeleteWebinar = (webinar: WebinarItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmModalState({
      isOpen: true,
      title: 'Delete Webinar',
      message: `Are you sure you want to delete webinar "${webinar.title}"? Note: Attendees already imported can be kept or removed.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'webinars', webinar.id));
          setWebinars(prev => prev.filter(w => w.id !== webinar.id));
          if (selectedWebinar?.id === webinar.id) {
            setSelectedWebinar(null);
          }
          await logAdminActivity(user?.email, 'DELETED', `Webinar: ${webinar.title}`);
          toast.success('Webinar deleted successfully');
        } catch (err) {
          console.error('Error deleting webinar:', err);
          toast.error('Failed to delete webinar');
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // -------------------------------------------------------------
  // CSV IMPORT & PREVIEW
  // -------------------------------------------------------------
  const triggerCsvUploadForWebinar = (webinar?: WebinarItem) => {
    const target = webinar || selectedWebinar;
    if (target) {
      setTargetWebinarId(target.id);
      setTargetWebinarTitle(target.title);
      setTargetWebinarDate(target.date);
    } else if (webinars.length > 0) {
      setTargetWebinarId(webinars[0].id);
      setTargetWebinarTitle(webinars[0].title);
      setTargetWebinarDate(webinars[0].date);
    } else {
      setTargetWebinarId('');
      setTargetWebinarTitle('AI & Full-Stack Career Roadmap');
      setTargetWebinarDate(new Date().toISOString().split('T')[0]);
    }
    fileInputRef.current?.click();
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCsvFileName(file.name);

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

  const handleConfirmImport = async () => {
    if (!parsedRows.length) {
      toast.error('No valid rows found to import.');
      return;
    }

    const finalTitle = targetWebinarTitle.trim() || 'General Webinar';
    setImporting(true);
    const toastId = toast.loading(`Importing ${parsedRows.length} students into "${finalTitle}"...`);

    try {
      const chunkSize = 400;
      for (let i = 0; i < parsedRows.length; i += chunkSize) {
        const chunk = parsedRows.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach(item => {
          const docRef = doc(collection(db, 'webinar_attendees'));
          batch.set(docRef, {
            webinarId: targetWebinarId || '',
            webinarTitle: finalTitle,
            webinarDate: targetWebinarDate,
            studentName: item.studentName,
            email: item.email,
            phone: item.phone,
            collegeName: item.collegeName,
            branch: item.branch,
            yearOfStudy: item.yearOfStudy,
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
        `Webinar: ${finalTitle}`,
        `Imported ${parsedRows.length} attendees via Google Form CSV (${csvFileName})`
      );

      toast.success(`Successfully imported ${parsedRows.length} attendees!`, { id: toastId });
      setShowImportModal(false);
      setParsedRows([]);
      setCsvFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
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

  // Export Attendees to CSV
  const exportAttendeesCSV = () => {
    const targetList = displayedAttendees;
    if (!targetList.length) {
      toast.error('No attendee records to export');
      return;
    }

    const headers = ["Student Name", "Email", "Phone", "College", "Branch", "Year", "Webinar Title", "Webinar Date", "Attendance Status", "Certificate Issued", "Registered Date"];
    const rows = targetList.map(a => [
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
    const prefix = selectedWebinar ? selectedWebinar.title.replace(/[^a-z0-9]/gi, '_') : 'all_webinars';
    link.setAttribute("download", `webinar_attendees_${prefix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${targetList.length} records to CSV`);
  };

  // -------------------------------------------------------------
  // ATTENDEE ACTIONS
  // -------------------------------------------------------------
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
      setSelectedIds(displayedAttendees.map(a => a.id));
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

  // Manual Add Student Submit
  const handleOpenAddStudent = (webinar?: WebinarItem) => {
    const target = webinar || selectedWebinar;
    setAddFormData({
      studentName: '',
      email: '',
      phone: '',
      collegeName: '',
      branch: '',
      yearOfStudy: '',
      webinarId: target?.id || '',
      webinarTitle: target?.title || (webinars[0]?.title || ''),
      webinarDate: target?.date || new Date().toISOString().split('T')[0],
      attendanceStatus: 'Registered',
    });
    setShowAddModal(true);
  };

  const handleAddManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.studentName.trim() || !addFormData.email.trim() || !addFormData.webinarTitle.trim()) {
      toast.error('Please provide Student Name, Email, and Webinar Title');
      return;
    }

    setIsAdding(true);
    const toastId = toast.loading('Adding student to webinar...');

    try {
      const newDoc = await addDoc(collection(db, 'webinar_attendees'), {
        webinarId: addFormData.webinarId || '',
        webinarTitle: addFormData.webinarTitle.trim(),
        webinarDate: addFormData.webinarDate,
        studentName: addFormData.studentName.trim(),
        email: addFormData.email.trim().toLowerCase(),
        phone: addFormData.phone.trim(),
        collegeName: addFormData.collegeName.trim() || 'N/A',
        branch: addFormData.branch.trim() || 'N/A',
        yearOfStudy: addFormData.yearOfStudy.trim() || 'N/A',
        timestamp: new Date().toISOString(),
        attendanceStatus: addFormData.attendanceStatus,
        certificateIssued: false,
        source: 'manual',
        createdAt: serverTimestamp(),
      });

      const newAttendee: WebinarAttendee = {
        id: newDoc.id,
        webinarId: addFormData.webinarId,
        webinarTitle: addFormData.webinarTitle.trim(),
        webinarDate: addFormData.webinarDate,
        studentName: addFormData.studentName.trim(),
        email: addFormData.email.trim().toLowerCase(),
        phone: addFormData.phone.trim(),
        collegeName: addFormData.collegeName.trim() || 'N/A',
        branch: addFormData.branch.trim() || 'N/A',
        yearOfStudy: addFormData.yearOfStudy.trim() || 'N/A',
        attendanceStatus: addFormData.attendanceStatus,
        certificateIssued: false,
        source: 'manual',
      };

      setAttendees(prev => [newAttendee, ...prev]);
      toast.success('Student added to webinar successfully!', { id: toastId });
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding attendee:', err);
      toast.error('Failed to add student', { id: toastId });
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

      {/* ========================================================= */}
      {/* 1. TOP HEADER & BREADCRUMB                                */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          {selectedWebinar ? (
            <div>
              <button
                onClick={() => { setSelectedWebinar(null); setSearchTerm(''); }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl transition-all mb-2 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back to All Webinars</span>
              </button>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {selectedWebinar.title}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                  selectedWebinar.status === 'Live' ? 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse' :
                  selectedWebinar.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  'bg-indigo-100 text-indigo-700 border-indigo-200'
                }`}>
                  {selectedWebinar.status}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><Calendar size={13}/> {selectedWebinar.date}</span>
                {selectedWebinar.time && <span className="flex items-center gap-1"><Clock size={13}/> {selectedWebinar.time}</span>}
                {selectedWebinar.speaker && <span className="flex items-center gap-1"><User size={13}/> Host: {selectedWebinar.speaker}</span>}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  <Video size={14} /> Private Webinars Management
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Lock size={12} /> Admin Only • Hidden from Public Website
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Create Webinars &amp; Manage Enrolled Students
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Create offline/online webinars, import Google Form response CSVs into each session, and track live student attendance.
              </p>
            </div>
          )}
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowFormatGuide(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs active:scale-95"
            title="View CSV Header Format"
          >
            <HelpCircle size={16} className="text-purple-600" />
            <span>CSV Format</span>
          </button>

          {selectedWebinar ? (
            <>
              <button
                onClick={() => triggerCsvUploadForWebinar(selectedWebinar)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-purple-600/20 cursor-pointer active:scale-95"
              >
                <Upload size={16} />
                <span>Import Google Form CSV</span>
              </button>

              <button
                onClick={() => handleOpenAddStudent(selectedWebinar)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
              >
                <Plus size={16} />
                <span>Add Student</span>
              </button>

              <button
                onClick={exportAttendeesCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
                title="Export this webinar attendees to CSV"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleOpenCreateWebinar}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-purple-600/20 cursor-pointer active:scale-95"
              >
                <Plus size={16} />
                <span>Create Webinar</span>
              </button>

              <button
                onClick={() => triggerCsvUploadForWebinar()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
              >
                <Upload size={16} />
                <span>Import CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. STATS SUMMARY GRID                                     */}
      {/* ========================================================= */}
      {selectedWebinar ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Enrolled Students</span>
              <Users size={18} className="text-purple-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{selectedWebinarStats?.total || 0}</p>
            <p className="text-[11px] font-medium text-slate-500">In this session</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Attended Live</span>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{selectedWebinarStats?.attended || 0}</p>
            <p className="text-[11px] font-bold text-emerald-700">{selectedWebinarStats?.rate || 0}% Attendance Rate</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Absent / Pending</span>
              <XCircle size={18} className="text-rose-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-600">{(selectedWebinarStats?.absent || 0) + (selectedWebinarStats?.registered || 0)}</p>
            <p className="text-[11px] font-medium text-slate-500">{selectedWebinarStats?.registered || 0} registered, {selectedWebinarStats?.absent || 0} absent</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Colleges</span>
              <School size={18} className="text-indigo-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{selectedWebinarStats?.colleges.size || 0}</p>
            <p className="text-[11px] font-medium text-slate-500">Participating colleges</p>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Certificates</span>
              <Award size={18} className="text-amber-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">{selectedWebinarStats?.certCount || 0}</p>
            <p className="text-[11px] font-medium text-slate-500">Issued for this session</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Webinars</span>
              <Video size={18} className="text-purple-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{globalStats.totalWebinars}</p>
            <p className="text-[11px] font-medium text-slate-500">Created sessions</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Students</span>
              <Users size={18} className="text-indigo-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600">{globalStats.totalStudents}</p>
            <p className="text-[11px] font-medium text-slate-500">Across all webinars</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Attended Live</span>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{globalStats.totalAttended}</p>
            <p className="text-[11px] font-bold text-emerald-700">{globalStats.rate}% Attendance Rate</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Certificates</span>
              <Award size={18} className="text-amber-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">{globalStats.totalCertificates}</p>
            <p className="text-[11px] font-medium text-slate-500">Issued credentials</p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MAIN CONTENT: WEBINAR CARDS OR ATTENDEE TABLE          */}
      {/* ========================================================= */}
      {!selectedWebinar ? (
        /* ------------------------------------------------------- */
        /* ALL WEBINARS LIST VIEW                                  */
        /* ------------------------------------------------------- */
        <div className="space-y-4">
          {/* Webinars Filter & Search */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search webinars by title, topic, or speaker..."
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

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium w-full sm:w-auto">
                <Filter size={14} className="text-slate-400 shrink-0" />
                <select
                  value={webinarStatusFilter}
                  onChange={(e) => setWebinarStatusFilter(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer w-full sm:w-auto"
                >
                  <option value="All">All Statuses</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Live">Live Now</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <button
                onClick={fetchData}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
                title="Refresh webinars"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Webinars Cards Grid */}
          {loading ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80">
              <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-medium text-slate-500">Loading webinars...</p>
            </div>
          ) : filteredWebinars.length === 0 ? (
            <div className="py-16 px-4 text-center max-w-md mx-auto bg-white rounded-3xl border border-slate-200/80">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Video size={28} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-1">No Webinars Created Yet</h3>
              <p className="text-xs text-slate-500 font-medium mb-6">
                Create a webinar first, and then add students or import Google Form CSV responses directly into it.
              </p>
              <button
                onClick={handleOpenCreateWebinar}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-md active:scale-95"
              >
                <Plus size={15} />
                <span>Create First Webinar</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWebinars.map(webinar => {
                const metrics = webinarMetrics.get(webinar.id) || { total: 0, attended: 0, absent: 0, registered: 0, certCount: 0, colleges: new Set() };
                const rate = metrics.total > 0 ? Math.round((metrics.attended / metrics.total) * 100) : 0;

                return (
                  <div
                    key={webinar.id}
                    onClick={() => { setSelectedWebinar(webinar); setSearchTerm(''); }}
                    className="bg-white rounded-3xl border border-slate-200/80 hover:border-purple-300 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                          webinar.status === 'Live' ? 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse' :
                          webinar.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          'bg-indigo-100 text-indigo-700 border-indigo-200'
                        }`}>
                          {webinar.status === 'Live' ? '● Live Now' : webinar.status}
                        </span>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleOpenEditWebinar(webinar, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                            title="Edit Webinar Details"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteWebinar(webinar, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Webinar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors leading-snug line-clamp-2">
                          {webinar.title}
                        </h3>
                        {webinar.topic && (
                          <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">
                            {webinar.topic}
                          </p>
                        )}
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="text-purple-600 shrink-0" />
                          <span className="font-bold text-slate-800">{webinar.date}</span>
                          {webinar.time && <span className="text-slate-400">• {webinar.time}</span>}
                        </div>
                        {webinar.speaker && (
                          <div className="flex items-center gap-2">
                            <User size={13} className="text-indigo-600 shrink-0" />
                            <span>Host: <strong className="text-slate-800">{webinar.speaker}</strong></span>
                          </div>
                        )}
                        {webinar.meetingLink && (
                          <div className="flex items-center gap-2 truncate">
                            <ExternalLink size={13} className="text-emerald-600 shrink-0" />
                            <a 
                              href={webinar.meetingLink} 
                              target="_blank" 
                              rel="noreferrer" 
                              onClick={(e) => e.stopPropagation()} 
                              className="text-emerald-700 font-medium hover:underline truncate"
                            >
                              {webinar.meetingLink}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Metrics & Actions */}
                    <div className="pt-4 mt-3 border-t border-slate-100 space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-purple-50/60 p-2 rounded-xl">
                          <p className="font-extrabold text-purple-900 text-sm">{metrics.total}</p>
                          <p className="text-[10px] text-purple-700 uppercase font-bold">Students</p>
                        </div>
                        <div className="bg-emerald-50/60 p-2 rounded-xl">
                          <p className="font-extrabold text-emerald-800 text-sm">{metrics.attended}</p>
                          <p className="text-[10px] text-emerald-700 uppercase font-bold">Attended ({rate}%)</p>
                        </div>
                        <div className="bg-amber-50/60 p-2 rounded-xl">
                          <p className="font-extrabold text-amber-800 text-sm">{metrics.certCount}</p>
                          <p className="text-[10px] text-amber-700 uppercase font-bold">Certificates</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedWebinar(webinar); }}
                          className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                        >
                          <Users size={14} />
                          <span>Manage Students ({metrics.total})</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); triggerCsvUploadForWebinar(webinar); }}
                          className="p-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold transition-all"
                          title="Import Google Form CSV into this webinar"
                        >
                          <Upload size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ------------------------------------------------------- */
        /* INSIDE SELECTED WEBINAR: ATTENDEE MANAGEMENT TABLE      */
        /* ------------------------------------------------------- */
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search students by name, email, phone, or college..."
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
                      <option value="All">All Colleges ({uniqueColleges.length})</option>
                      {uniqueColleges.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={fetchData}
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
                  {selectedIds.length} students selected
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
            {displayedAttendees.length === 0 ? (
              <div className="py-16 px-4 text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Users size={28} />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-1">No Students in this Webinar</h3>
                <p className="text-xs text-slate-500 font-medium mb-6">
                  Upload your Google Form response CSV or add students individually.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => triggerCsvUploadForWebinar(selectedWebinar)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-md"
                  >
                    <Upload size={15} />
                    <span>Import Google Form CSV</span>
                  </button>
                  <button
                    onClick={() => handleOpenAddStudent(selectedWebinar)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    <Plus size={15} />
                    <span>Add Student</span>
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
                            checked={selectedIds.length === displayedAttendees.length && displayedAttendees.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        </th>
                        <th className="p-4">Student &amp; Contact</th>
                        <th className="p-4">College &amp; Branch</th>
                        <th className="p-4">Registration Time</th>
                        <th className="p-4">Live Attendance</th>
                        <th className="p-4">Certificate</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {displayedAttendees.map((attendee) => {
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
                            <td className="p-4 text-slate-500 text-[11px]">
                              {attendee.timestamp ? new Date(attendee.timestamp).toLocaleString() : '—'}
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
                  {displayedAttendees.map((attendee) => {
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
                          <p className="text-slate-600 flex items-center gap-1 font-medium">
                            <School size={12} className="text-indigo-600 shrink-0" />
                            <span>{attendee.collegeName}</span>
                          </p>
                          {(attendee.branch !== 'N/A' || attendee.yearOfStudy !== 'N/A') && (
                            <p className="text-slate-400 text-[11px]">
                              {attendee.branch} • {attendee.yearOfStudy}
                            </p>
                          )}
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
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MODALS (CREATE WEBINAR, CSV IMPORT, ADD STUDENT, GUIDE) */}
      {/* ========================================================= */}

      {/* CREATE / EDIT WEBINAR MODAL */}
      {showWebinarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[92dvh] flex flex-col border border-gray-100 my-auto">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Video size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    {editingWebinar ? 'Edit Webinar' : 'Create New Webinar'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Configure session info &amp; meeting details</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWebinarModal(false)}
                className="p-2 hover:bg-slate-200/80 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWebinar} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-none space-y-3.5 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Webinar Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={webinarFormData.title}
                    onChange={(e) => setWebinarFormData({ ...webinarFormData, title: e.target.value })}
                    placeholder="e.g. Masterclass on AI & Full-Stack Roadmap"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Topic / Subtitle Description
                  </label>
                  <input
                    type="text"
                    value={webinarFormData.topic}
                    onChange={(e) => setWebinarFormData({ ...webinarFormData, topic: e.target.value })}
                    placeholder="e.g. Modern Web Development, System Design, & Industry Career Path"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Host / Speaker Name</label>
                    <input
                      type="text"
                      value={webinarFormData.speaker}
                      onChange={(e) => setWebinarFormData({ ...webinarFormData, speaker: e.target.value })}
                      placeholder="e.g. Er. Rahul & Technical Team"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status</label>
                    <select
                      value={webinarFormData.status}
                      onChange={(e) => setWebinarFormData({ ...webinarFormData, status: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-bold bg-white"
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Live">Live Now</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Webinar Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={webinarFormData.date}
                      onChange={(e) => setWebinarFormData({ ...webinarFormData, date: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Time Timing</label>
                    <input
                      type="text"
                      value={webinarFormData.time}
                      onChange={(e) => setWebinarFormData({ ...webinarFormData, time: e.target.value })}
                      placeholder="e.g. 05:00 PM - 06:30 PM"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Online Meeting Link (Google Meet / Zoom / YouTube)</label>
                  <input
                    type="url"
                    value={webinarFormData.meetingLink}
                    onChange={(e) => setWebinarFormData({ ...webinarFormData, meetingLink: e.target.value })}
                    placeholder="https://meet.google.com/xyz-abcd-efg"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Google Form Registration Link (Shared with students)</label>
                  <input
                    type="url"
                    value={webinarFormData.formLink}
                    onChange={(e) => setWebinarFormData({ ...webinarFormData, formLink: e.target.value })}
                    placeholder="https://forms.gle/abcdef12345"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-medium"
                  />
                </div>
              </div>

              <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowWebinarModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-gray-200 hover:bg-slate-100 transition-colors text-xs sm:text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingWebinar}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs sm:text-sm hover:bg-purple-700 transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {isSavingWebinar ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    editingWebinar ? 'Update Webinar' : 'Create Webinar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <li>Open any webinar and click <strong>Import Google Form CSV</strong>.</li>
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
                        <td className="p-2.5 font-bold">Timestamp</td>
                        <td className="p-2.5 font-mono text-[11px] text-purple-700">Timestamp, Date, Submitted At</td>
                        <td className="p-2.5 text-slate-500 font-medium">Optional</td>
                        <td className="p-2.5">2026/08/17 4:30 PM</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
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
              {/* Destination Webinar Selection */}
              <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-purple-900 mb-1">
                    Destination Webinar Session <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetWebinarId}
                    onChange={(e) => {
                      const wid = e.target.value;
                      setTargetWebinarId(wid);
                      const found = webinars.find(w => w.id === wid);
                      if (found) {
                        setTargetWebinarTitle(found.title);
                        setTargetWebinarDate(found.date);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-bold text-slate-900 text-xs sm:text-base"
                  >
                    {webinars.map(w => (
                      <option key={w.id} value={w.id}>{w.title} ({w.date})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-purple-900 mb-1">
                    Webinar Topic / Title Override
                  </label>
                  <input
                    type="text"
                    required
                    value={targetWebinarTitle}
                    onChange={(e) => setTargetWebinarTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white font-bold text-slate-900 text-xs sm:text-base"
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
                disabled={importing || !targetWebinarTitle.trim()}
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
                    <span>Confirm &amp; Import {parsedRows.length} Students</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL ADD STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92dvh] flex flex-col border border-gray-100 my-auto">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Plus size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Add Student to Webinar</h2>
                  <p className="text-xs text-slate-500 font-medium">Manually register a student for a session</p>
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
                  <label className="block font-bold text-slate-700 mb-1">
                    Select Webinar Session <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addFormData.webinarId}
                    onChange={(e) => {
                      const wid = e.target.value;
                      const found = webinars.find(w => w.id === wid);
                      setAddFormData({
                        ...addFormData,
                        webinarId: wid,
                        webinarTitle: found?.title || '',
                        webinarDate: found?.date || addFormData.webinarDate,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs sm:text-base font-bold bg-white"
                  >
                    {webinars.map(w => (
                      <option key={w.id} value={w.id}>{w.title} ({w.date})</option>
                    ))}
                  </select>
                </div>

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
                    <label className="block font-bold text-slate-700 mb-1">Initial Attendance Status</label>
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
                    'Add Student'
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
