import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  BookOpen, 
  MessageSquare, 
  Award,
  Briefcase,
  ShieldCheck,
  Plus,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Phone,
  Mail,
  ListOrdered
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { logAdminActivity } from '../../utils/adminLogger';
import { useAuth } from '../../hooks/useAuth';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    students: 0,
    institutes: 0,
    courses: 0,
    enquiries: 0,
    certificates: 0,
    internships: 0,
    staff: 0
  });

  const [trends, setTrends] = useState({
    students: 0,
    institutes: 0,
    courses: 0,
    enquiries: 0
  });

  const [recentEnquiries, setRecentEnquiries] = useState<any[]>([]);
  const [chartData, setChartData] = useState<Array<{ name: string; enquiries: number; students: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [
        usersSnap, 
        coursesSnap, 
        enquiriesSnap, 
        partnershipSnap, 
        contactSnap, 
        collaboratorsSnap,
        certificatesSnap,
        internshipsSnap,
        staffSnap
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'enquiries')),
        getDocs(collection(db, 'partnershipEnquiries')),
        getDocs(collection(db, 'contactMessages')),
        getDocs(collection(db, 'collaborators')),
        getDocs(collection(db, 'certificates')),
        getDocs(collection(db, 'internships')),
        getDocs(collection(db, 'staff'))
      ]);

      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      let newStudents = 0;
      let newInstitutes = 0;
      let newCourses = 0;
      let newEnquiries = 0;

      const usersData = usersSnap.docs.map(d => d.data());
      const studentCount = usersData.filter(u => {
        if (u.role === 'student') {
          if (u.createdAt?.toMillis && now - u.createdAt.toMillis() < thirtyDaysMs) newStudents++;
          return true;
        }
        return false;
      }).length;

      const instituteCount = collaboratorsSnap.size;
      collaboratorsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.createdAt?.toMillis && now - data.createdAt.toMillis() < thirtyDaysMs) newInstitutes++;
      });

      coursesSnap.docs.forEach(d => {
        const data = d.data();
        if (data.createdAt?.toMillis && now - data.createdAt.toMillis() < thirtyDaysMs) newCourses++;
      });

      const totalEnquiriesCount = enquiriesSnap.size + partnershipSnap.size + contactSnap.size;

      enquiriesSnap.docs.forEach(d => {
        const data = d.data();
        if (data.createdAt?.toMillis && now - data.createdAt.toMillis() < thirtyDaysMs) newEnquiries++;
      });
      partnershipSnap.docs.forEach(d => {
        const data = d.data();
        if (data.createdAt?.toMillis && now - data.createdAt.toMillis() < thirtyDaysMs) newEnquiries++;
      });
      contactSnap.docs.forEach(d => {
        const data = d.data();
        if (data.createdAt?.toMillis && now - data.createdAt.toMillis() < thirtyDaysMs) newEnquiries++;
      });

      setStats({
        students: studentCount,
        institutes: instituteCount,
        courses: coursesSnap.size,
        enquiries: totalEnquiriesCount,
        certificates: certificatesSnap.size,
        internships: internshipsSnap.size,
        staff: staffSnap.size
      });

      setTrends({
        students: newStudents,
        institutes: newInstitutes,
        courses: newCourses,
        enquiries: newEnquiries
      });

      // Combine and sort recent leads from all streams
      const rawEnquiries: any[] = [
        ...enquiriesSnap.docs.map(d => ({ id: d.id, collection: 'enquiries', type: d.data().type || 'Course Lead', ...d.data() })),
        ...partnershipSnap.docs.map(d => ({ id: d.id, collection: 'partnershipEnquiries', type: 'Partnership', ...d.data() })),
        ...contactSnap.docs.map(d => ({ id: d.id, collection: 'contactMessages', type: 'General Contact', ...d.data() }))
      ];

      rawEnquiries.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
        return timeB - timeA;
      });

      setRecentEnquiries(rawEnquiries.slice(0, 6));

      // Calculate 6-month chart trends
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonthIdx = new Date().getMonth();
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const idx = (currentMonthIdx - i + 12) % 12;
        last6Months.push(months[idx]);
      }

      // Group enquiries and students by month
      const trendsMap: Record<string, { enquiries: number; students: number }> = {};
      last6Months.forEach(m => {
        trendsMap[m] = { enquiries: 0, students: 0 };
      });

      rawEnquiries.forEach(e => {
        const d = e.createdAt?.toDate ? e.createdAt.toDate() : e.createdAt?.seconds ? new Date(e.createdAt.seconds * 1000) : null;
        if (d) {
          const m = months[d.getMonth()];
          if (trendsMap[m]) trendsMap[m].enquiries += 1;
        }
      });

      usersData.forEach(u => {
        if (u.role === 'student' && u.createdAt) {
          const d = u.createdAt?.toDate ? u.createdAt.toDate() : u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000) : null;
          if (d) {
            const m = months[d.getMonth()];
            if (trendsMap[m]) trendsMap[m].students += 1;
          }
        }
      });

      setChartData(
        last6Months.map(m => ({
          name: m,
          enquiries: trendsMap[m].enquiries,
          students: trendsMap[m].students
        }))
      );

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleUpdateStatus = async (item: any, newStatus: string) => {
    try {
      await updateDoc(doc(db, item.collection, item.id), {
        status: newStatus
      });
      toast.success(`Enquiry marked as ${newStatus}`);
      await logAdminActivity(
        user?.email,
        'STATUS_CHANGE',
        `Enquiry: ${item.name || item.email}`,
        `Changed status to ${newStatus}`
      );
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating enquiry:', error);
      toast.error('Failed to update status');
    }
  };

  const statCards = [
    {
      title: 'Total Students',
      value: stats.students,
      trend: `+${trends.students} this month`,
      icon: Users,
      color: 'bg-blue-500',
      lightBg: 'bg-blue-50 text-blue-700',
      link: '/admin/students'
    },
    {
      title: 'Partner Institutes',
      value: stats.institutes,
      trend: `+${trends.institutes} this month`,
      icon: Building2,
      color: 'bg-indigo-500',
      lightBg: 'bg-indigo-50 text-indigo-700',
      link: '/admin/collaborators'
    },
    {
      title: 'Active Courses',
      value: stats.courses,
      trend: `+${trends.courses} new`,
      icon: BookOpen,
      color: 'bg-purple-500',
      lightBg: 'bg-purple-50 text-purple-700',
      link: '/admin/courses'
    },
    {
      title: 'Total Enquiries',
      value: stats.enquiries,
      trend: `+${trends.enquiries} new leads`,
      icon: MessageSquare,
      color: 'bg-amber-500',
      lightBg: 'bg-amber-50 text-amber-700',
      link: '/admin/enquiries'
    },
    {
      title: 'Certificates Issued',
      value: stats.certificates,
      trend: 'Verified credentials',
      icon: Award,
      color: 'bg-emerald-500',
      lightBg: 'bg-emerald-50 text-emerald-700',
      link: '/admin/certificates'
    },
    {
      title: 'Active Staff Members',
      value: stats.staff,
      trend: 'Managed instructors',
      icon: ShieldCheck,
      color: 'bg-rose-500',
      lightBg: 'bg-rose-50 text-rose-700',
      link: '/admin/staff'
    }
  ];

  const quickLinks = [
    { name: 'Enroll Student', path: '/admin/students', icon: Users, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
    { name: 'Issue Certificate', path: '/admin/certificates', icon: Award, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
    { name: 'Manage Courses', path: '/admin/courses', icon: BookOpen, color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
    { name: 'Review Enquiries', path: '/admin/enquiries', icon: MessageSquare, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
    { name: 'Partner Institutes', path: '/admin/collaborators', icon: Building2, color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
    { name: 'Internship Programs', path: '/admin/internships', icon: Briefcase, color: 'text-teal-600 bg-teal-50 hover:bg-teal-100' },
    { name: 'Staff & Payroll', path: '/admin/staff', icon: ShieldCheck, color: 'text-rose-600 bg-rose-50 hover:bg-rose-100' },
    { name: 'Audit Logs', path: '/admin/logs', icon: ListOrdered, color: 'text-slate-600 bg-slate-100 hover:bg-slate-200' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Admin Overview</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Real-time performance metrics and cross-functional operations.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-indigo-600' : 'text-slate-500'} />
            <span>Refresh</span>
          </button>
          
          <Link 
            to="/admin/students"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-indigo-600/20"
          >
            <Plus size={18} />
            <span>Enroll Student</span>
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link 
              key={idx}
              to={card.link}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-slate-500">{card.title}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.lightBg} group-hover:scale-105 transition-transform`}>
                  <Icon size={20} />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {loading ? (
                    <div className="h-9 w-20 bg-slate-200 animate-pulse rounded-lg" />
                  ) : (
                    card.value.toLocaleString()
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mt-2">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <span>{card.trend}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Management Hub</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {quickLinks.map((ql, idx) => {
            const Icon = ql.icon;
            return (
              <Link
                key={idx}
                to={ql.path}
                className={`flex flex-col items-center justify-center text-center p-3.5 rounded-xl font-bold text-xs transition-all ${ql.color}`}
              >
                <Icon size={22} className="mb-2" />
                <span className="leading-tight">{ql.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Charts & Triage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Enquiry & Growth Trajectory</h2>
              <p className="text-xs text-slate-500 font-medium">Monthly lead volume and student conversions</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-indigo-600">
                <span className="w-3 h-3 rounded-full bg-indigo-600" /> Leads
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-3 h-3 rounded-full bg-emerald-600" /> Students
              </span>
            </div>
          </div>

          <div className="h-72 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEnquiries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="enquiries" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorEnquiries)" />
                <Area type="monotone" dataKey="students" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Triage Widget */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent Leads</h2>
              <p className="text-xs text-slate-500 font-medium">Quick triage incoming inquiries</p>
            </div>
            <Link to="/admin/enquiries" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[340px]">
            {loading ? (
              <div className="py-12 text-center text-slate-400 font-medium text-sm">Loading leads...</div>
            ) : recentEnquiries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium text-sm">No recent enquiries found.</div>
            ) : (
              recentEnquiries.map((item) => {
                const status = (item.status || 'new').toLowerCase();
                return (
                  <div key={item.id} className="py-3.5 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">
                          {item.name || item.instituteName || 'Anonymous'}
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {item.type || item.targetTitle || 'Inquiry'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        status === 'converted' || status === 'responded'
                          ? 'bg-emerald-100 text-emerald-700'
                          : status === 'read' || status === 'in review'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-3">
                        {item.phone && (
                          <a href={`tel:${item.phone}`} className="hover:text-indigo-600 flex items-center gap-1">
                            <Phone size={12} /> {item.phone}
                          </a>
                        )}
                        {item.email && (
                          <a href={`mailto:${item.email}`} className="hover:text-indigo-600 flex items-center gap-1">
                            <Mail size={12} />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {status === 'new' && (
                          <button
                            onClick={() => handleUpdateStatus(item, 'In Review')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px]"
                          >
                            Review
                          </button>
                        )}
                        {status !== 'converted' && (
                          <Link
                            to={`/admin/students?enrollName=${encodeURIComponent(item.name || '')}&enrollEmail=${encodeURIComponent(item.email || '')}&enrollPhone=${encodeURIComponent(item.phone || '')}`}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[10px]"
                          >
                            Enroll
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
