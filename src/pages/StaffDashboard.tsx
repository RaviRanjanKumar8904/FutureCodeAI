import { useAuth } from '../hooks/useAuth';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { CalendarDays, ClipboardList, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardShell from '../components/layout/DashboardShell';

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
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'staff') return <Navigate to="/dashboard/student" />;

  const navItems = [
    { name: 'Schedule', path: '/dashboard/staff', icon: CalendarDays },
    { name: 'Attendance', path: '/dashboard/staff/attendance', icon: ClipboardList },
    { name: 'Profile', path: '/dashboard/staff/settings', icon: User },
  ];

  return (
    <DashboardShell navItems={navItems} portalLabel="Staff Portal" variant="light">
      <div className="p-4 md:p-8 lg:p-10 max-w-6xl mx-auto w-full pb-8">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Staff Dashboard</p>
              <h1 className="text-3xl font-bold text-text-heading">Welcome back, {user.displayName?.split(' ')[0] || 'Staff'}</h1>
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
            <Routes>
              <Route path="/" element={<StaffSchedule />} />
              <Route path="attendance" element={<StaffAttendance />} />
              <Route path="settings" element={<StaffProfile />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}
