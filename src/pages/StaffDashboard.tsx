import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { CalendarDays, ClipboardList, User, LogOut, Menu, X, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const scheduledClasses = [
  {
    id: 'sc1',
    title: 'AI Classroom Essentials',
    date: 'Aug 5, 2026',
    time: '10:00 AM - 12:00 PM',
    location: 'Purnea Batch Room',
    instructor: 'Ravi Ranjan',
  },
  {
    id: 'sc2',
    title: 'Machine Learning Lab',
    date: 'Aug 7, 2026',
    time: '2:00 PM - 4:00 PM',
    location: 'Offline Campus',
    instructor: 'Anjali Sharma',
  },
];

const attendanceLog = [
  {
    id: 'att1',
    className: 'AI Classroom Essentials',
    date: 'Jul 29, 2026',
    status: 'Present',
  },
  {
    id: 'att2',
    className: 'ML Workshop',
    date: 'Jul 30, 2026',
    status: 'Present',
  },
  {
    id: 'att3',
    className: 'Data Structures Practice',
    date: 'Jul 31, 2026',
    status: 'Absent',
  },
];

function StaffSchedule() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-text-heading">Scheduled Classes</h2>
            <p className="text-sm text-slate-500 mt-2">View and manage your upcoming class schedule.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-semibold">
            <CalendarDays size={18} /> Updated hourly
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {scheduledClasses.map((session) => (
            <div key={session.id} className="rounded-3xl border border-gray-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{session.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{session.instructor}</p>
                </div>
                <span className="rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1">Upcoming</span>
              </div>
              <div className="mt-5 grid gap-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Date</span>
                  <span>{session.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Time</span>
                  <span>{session.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Location</span>
                  <span>{session.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StaffAttendance() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-extrabold text-text-heading">Attendance Log</h2>
        <p className="text-sm text-slate-500 mt-2">Track recent attendance for your assigned sessions.</p>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm divide-y divide-gray-200">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Class</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attendanceLog.map((entry) => (
                <tr key={entry.id} className="bg-white">
                  <td className="px-4 py-4 font-medium text-slate-800">{entry.className}</td>
                  <td className="px-4 py-4 text-slate-600">{entry.date}</td>
                  <td className={`px-4 py-4 font-semibold ${entry.status === 'Present' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {entry.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StaffProfile() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-text-heading">Your Staff Profile</h2>
            <p className="text-sm text-slate-500 mt-2">Maintain your contact and assignment details.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-[0.24em]">Name</h3>
            <p className="mt-3 text-lg font-semibold text-slate-900">{user?.displayName}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-[0.24em]">Email</h3>
            <p className="mt-3 text-lg font-semibold text-slate-900">{user?.email}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-[0.24em]">Role</h3>
            <p className="mt-3 text-lg font-semibold text-slate-900">Staff</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-[0.24em]">Status</h3>
            <p className="mt-3 text-lg font-semibold text-emerald-600">Active</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setSidebarOpen(false);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'staff') return <Navigate to="/dashboard/student" />;

  const navItems = [
    { name: 'Schedule', path: '/dashboard/staff', icon: CalendarDays },
    { name: 'Attendance', path: '/dashboard/staff/attendance', icon: ClipboardList },
    { name: 'Profile', path: '/dashboard/staff/settings', icon: User },
  ];

  return (
    <div className="h-[100dvh] bg-slate-50 flex flex-col md:flex-row font-body">
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-30 relative shadow-sm shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Logo" className="h-8 w-auto rounded-md" />
          <span className="font-heading font-extrabold text-lg tracking-tight">
            <span className="text-[#152a4f]">FutureCode</span>
            <span className="text-[#24a4b5]">AI</span>
          </span>
        </Link>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-600 bg-slate-100 rounded-lg">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {(sidebarOpen || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed md:sticky top-0 left-0 z-40 h-[100dvh] w-64 bg-white border-r border-gray-100 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}
          >
            <div className="hidden md:flex h-20 items-center px-6 border-b border-gray-50">
              <Link to="/" className="flex items-center gap-3">
                <img src="/logo.jpg" alt="Logo" className="h-9 w-auto rounded-md" />
                <span className="font-heading font-extrabold text-xl tracking-tight">
                  <span className="text-[#152a4f]">FutureCode</span>
                  <span className="text-[#24a4b5]">AI</span>
                </span>
              </Link>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
              <div className="px-4 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Staff Portal</div>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-white shadow-glow-primary'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-gray-50 flex flex-col gap-2">
              <Link
                to="/"
                className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 font-medium hover:bg-slate-50 hover:text-primary rounded-xl transition-colors"
              >
                <Globe size={20} />
                Main Website
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full px-4 py-3 text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main ref={mainRef} className="flex-1 min-w-0 min-h-0 overflow-y-auto overscroll-contain scroll-smooth -webkit-overflow-scrolling-touch">
        <div className="p-4 md:p-8 lg:p-10 max-w-6xl mx-auto w-full pb-8">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">Staff Dashboard</p>
                <h1 className="text-3xl font-bold text-text-heading">Welcome back, {user.displayName.split(' ')[0]}</h1>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Active staff access
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-3 sm:grid-flow-col sm:auto-cols-max">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={`px-4 py-3 rounded-2xl font-semibold transition-colors ${
                          isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>

              <Routes>
                <Route path="/" element={<StaffSchedule />} />
                <Route path="attendance" element={<StaffAttendance />} />
                <Route path="settings" element={<StaffProfile />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
