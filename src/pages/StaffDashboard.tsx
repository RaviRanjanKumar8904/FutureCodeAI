import { useAuth } from '../hooks/useAuth';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { CalendarDays, ClipboardList, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardShell from '../components/layout/DashboardShell';
import StaffAttendance from '../components/staff/StaffAttendance';
import StaffSchedule from '../components/staff/StaffSchedule';

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
          {user?.assignedCenter && (
            <div className="rounded-3xl bg-slate-50 p-5 sm:col-span-2">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-[0.24em]">Assigned Center</h3>
              <p className="mt-3 text-lg font-semibold text-slate-900">{user.assignedCenter}</p>
            </div>
          )}
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
