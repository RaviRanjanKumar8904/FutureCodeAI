import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { 
  MessageSquare, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Download, 
  UserCheck, 
  Trash2, 
  GraduationCap,
  Building2,
  CheckCircle2,
  XCircle,
  Clock3,
  HelpCircle,
  Hash
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { logAdminActivity } from '../../utils/adminLogger';
import { exportCSV } from '../../utils/csv';
import { sendNotification } from '../../utils/notificationService';

interface NormalizedEnquiry {
  id: string;
  collection: 'enquiries' | 'partnershipEnquiries' | 'contactMessages';
  type: 'Course' | 'Internship' | 'Partnership' | 'Contact';
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  collegeName?: string;
  rollNo?: string;
  city?: string;
  preferredLocation?: string;
  educationDetails?: string;
  userType?: string;
  targetTitle?: string;
  instituteName?: string;
  subject?: string;
  message?: string;
  status: string;
  createdAt: any;
}

export default function ManageEnquiries() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<NormalizedEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const [courseSnap, partnershipSnap, contactSnap] = await Promise.all([
        getDocs(query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'), limit(300))),
        getDocs(query(collection(db, 'partnershipEnquiries'), orderBy('createdAt', 'desc'), limit(150))),
        getDocs(query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc'), limit(150)))
      ]);

      const courseList: NormalizedEnquiry[] = courseSnap.docs.map(doc => {
        const data = doc.data();
        const isInternship = data.type === 'internship' || (data.targetTitle && data.targetTitle.toLowerCase().includes('internship'));
        return {
          id: doc.id,
          collection: 'enquiries',
          type: isInternship ? 'Internship' : 'Course',
          name: data.name || 'Anonymous',
          email: data.email || '',
          phone: data.phone || '',
          gender: data.gender || '',
          collegeName: data.collegeName || '',
          rollNo: data.rollNo || '',
          city: data.city || '',
          preferredLocation: data.preferredLocation || '',
          educationDetails: data.educationDetails || '',
          userType: data.userType || '',
          targetTitle: data.targetTitle || data.courseName || data.title || '',
          message: data.message || '',
          status: data.status || 'New',
          createdAt: data.createdAt
        };
      });

      const partnershipList: NormalizedEnquiry[] = partnershipSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          collection: 'partnershipEnquiries',
          type: 'Partnership',
          name: data.contactPerson || data.name || 'Anonymous',
          email: data.email || '',
          phone: data.phone || '',
          gender: data.gender || '',
          collegeName: data.instituteName || '',
          rollNo: '',
          city: data.city || '',
          instituteName: data.instituteName || data.name || '',
          message: data.message || '',
          status: data.status || 'New',
          createdAt: data.createdAt
        };
      });

      const contactList: NormalizedEnquiry[] = contactSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          collection: 'contactMessages',
          type: 'Contact',
          name: data.name || 'Anonymous',
          email: data.email || '',
          phone: data.phone || '',
          gender: '',
          collegeName: '',
          rollNo: '',
          subject: data.subject || '',
          message: data.message || '',
          status: data.status || 'New',
          createdAt: data.createdAt
        };
      });

      const combined = [...courseList, ...partnershipList, ...contactList];

      // Sort descending by timestamp
      combined.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
        return timeB - timeA;
      });

      setEnquiries(combined);
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      toast.error('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const handleUpdateStatus = async (item: NormalizedEnquiry, newStatus: string) => {
    try {
      await updateDoc(doc(db, item.collection, item.id), {
        status: newStatus
      });
      toast.success(`Marked as ${newStatus}`);
      await logAdminActivity(
        user?.email,
        'STATUS_CHANGE',
        `Enquiry (${item.type}): ${item.name}`,
        `Updated status to ${newStatus}`
      );

      if (item.email) {
        await sendNotification({
          userEmail: item.email,
          title: `Application Status: ${newStatus}`,
          message: `Your ${item.type.toLowerCase()} application/enquiry for "${item.targetTitle || item.name}" is now marked as "${newStatus}".`,
          type: 'enquiry',
          link: '/dashboard/student'
        });
      }

      fetchEnquiries();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (item: NormalizedEnquiry) => {
    if (!window.confirm(`Delete enquiry from "${item.name}"?`)) return;
    try {
      await deleteDoc(doc(db, item.collection, item.id));
      toast.success('Enquiry deleted');
      await logAdminActivity(
        user?.email,
        'DELETED',
        `Enquiry (${item.type}): ${item.name}`
      );
      fetchEnquiries();
    } catch (error) {
      console.error('Error deleting enquiry:', error);
      toast.error('Failed to delete enquiry');
    }
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.error('No enquiries to export');
      return;
    }

    const csvRows = filteredData.map(e => ({
      Type: e.type,
      Name: e.name,
      Gender: e.gender || '',
      Email: e.email,
      Phone: e.phone || '',
      College: e.collegeName || e.instituteName || '',
      RollNo: e.rollNo || '',
      City: e.city || '',
      Target: e.targetTitle || e.instituteName || e.subject || '',
      UserType: e.userType || '',
      Education: e.educationDetails || '',
      Message: e.message || '',
      Status: e.status,
      Date: e.createdAt?.toDate ? e.createdAt.toDate().toLocaleString() : ''
    }));

    exportCSV(`enquiries_export_${new Date().toISOString().split('T')[0]}`, csvRows);
  };

  const filteredData = enquiries.filter(item => {
    const matchesType = filterType === 'All' ? true : item.type === filterType;
    const matchesStatus = filterStatus === 'All' ? true : item.status.toLowerCase() === filterStatus.toLowerCase();
    
    const searchString = `${item.name} ${item.email} ${item.phone || ''} ${item.gender || ''} ${item.collegeName || ''} ${item.rollNo || ''} ${item.city || ''} ${item.targetTitle || ''} ${item.instituteName || ''} ${item.subject || ''} ${item.message || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());

    return matchesType && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string = 'New') => {
    const s = status.toLowerCase();
    if (s === 'converted' || s === 'enrolled' || s === 'responded') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800"><CheckCircle2 size={12} /> {status}</span>;
    }
    if (s === 'in review' || s === 'contacted' || s === 'read') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800"><Clock3 size={12} /> {status}</span>;
    }
    if (s === 'rejected' || s === 'closed') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800"><XCircle size={12} /> {status}</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800"><HelpCircle size={12} /> {status}</span>;
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Course':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-700"><GraduationCap size={12} /> Course</span>;
      case 'Internship':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-100 text-teal-700">Internship</span>;
      case 'Partnership':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-700"><Building2 size={12} /> College/Inst</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">Contact</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Manage Enquiries & Leads</h1>
            <p className="text-sm text-slate-500 font-medium">Unified lead funnel across courses, internships, and partnership requests.</p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors shadow-sm self-start md:self-auto"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by name, email, college, roll no, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium w-full focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Type and Status Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1">
              <span className="text-xs font-bold text-slate-400 pl-1">Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent py-1 pr-2 outline-none cursor-pointer"
              >
                <option value="All">All Types</option>
                <option value="Course">Courses</option>
                <option value="Internship">Internships</option>
                <option value="Partnership">Partnerships</option>
                <option value="Contact">Contact</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1">
              <span className="text-xs font-bold text-slate-400 pl-1">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent py-1 pr-2 outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="New">New</option>
                <option value="In Review">In Review</option>
                <option value="Converted">Converted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500 px-2.5 py-1 bg-slate-200/60 rounded-lg">
              {filteredData.length} leads
            </div>
          </div>
        </div>

        {/* Leads Table / Cards */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent mx-auto mb-3" />
            <p className="text-slate-400 font-medium text-sm">Loading enquiries...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-24 text-center">
            <MessageSquare size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-bold text-slate-700">No enquiries found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredData.map((item) => (
              <div key={`${item.collection}-${item.id}`} className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col lg:flex-row gap-4 justify-between items-start">
                
                {/* Main Lead Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {getTypeBadge(item.type)}
                    <h3 className="text-base font-extrabold text-slate-900">{item.name}</h3>
                    {item.gender && (
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {item.gender}
                      </span>
                    )}
                    {item.userType && (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {item.userType}
                      </span>
                    )}
                    {getStatusBadge(item.status)}
                  </div>

                  {/* Target, College, Roll No and Education */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 font-medium">
                    {(item.targetTitle || item.instituteName || item.subject) && (
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                        {item.targetTitle || item.instituteName || item.subject}
                      </span>
                    )}
                    {item.collegeName && (
                      <span className="flex items-center gap-1 font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                        <Building2 size={12} className="text-teal-600" /> {item.collegeName}
                      </span>
                    )}
                    {item.rollNo && (
                      <span className="flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                        <Hash size={12} className="text-amber-600" /> {item.rollNo}
                      </span>
                    )}
                    {item.city && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin size={13} className="text-slate-400" /> {item.city} {item.preferredLocation ? `(${item.preferredLocation})` : ''}
                      </span>
                    )}
                    {item.educationDetails && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <GraduationCap size={13} className="text-slate-400" /> {item.educationDetails}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock size={13} /> {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : 'Recent'}
                    </span>
                  </div>

                  {/* Message / Details */}
                  {item.message && (
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 font-normal leading-relaxed">
                      "{item.message}"
                    </p>
                  )}
                </div>

                {/* Actions Panel */}
                <div className="flex flex-wrap lg:flex-col items-end gap-2 shrink-0 self-stretch lg:self-auto justify-between lg:justify-start pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 w-full lg:w-auto">
                  
                  {/* Direct Contact Links */}
                  <div className="flex items-center gap-2">
                    {item.phone && (
                      <a
                        href={`tel:${item.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-xs transition-colors"
                        title="Call Applicant"
                      >
                        <Phone size={13} /> {item.phone}
                      </a>
                    )}
                    {item.email && (
                      <a
                        href={`mailto:${item.email}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-xs transition-colors"
                        title="Email Applicant"
                      >
                        <Mail size={13} /> {item.email}
                      </a>
                    )}
                  </div>

                  {/* Status Changers & Cross-Functional Conversion */}
                  <div className="flex items-center gap-2 mt-2">
                    <select
                      value={item.status}
                      onChange={(e) => handleUpdateStatus(item, e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300"
                    >
                      <option value="New">New</option>
                      <option value="In Review">In Review</option>
                      <option value="Converted">Converted</option>
                      <option value="Rejected">Rejected</option>
                    </select>

                    {/* Cross-functional shortcut to enroll student */}
                    <Link
                      to={`/admin/students?enrollName=${encodeURIComponent(item.name)}&enrollEmail=${encodeURIComponent(item.email)}&enrollPhone=${encodeURIComponent(item.phone || '')}&enrollGender=${encodeURIComponent(item.gender || '')}&enrollCollege=${encodeURIComponent(item.collegeName || '')}&enrollRollNo=${encodeURIComponent(item.rollNo || '')}&enrollCourse=${encodeURIComponent(item.targetTitle || '')}&enrollCenter=${encodeURIComponent(item.city || '')}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                      title="Convert Lead to Student Enrollment"
                    >
                      <UserCheck size={13} />
                      <span>Convert to Student</span>
                    </Link>

                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Enquiry"
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
    </div>
  );
}
