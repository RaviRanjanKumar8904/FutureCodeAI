import { useAuth } from '../hooks/useAuth';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  MessageSquare, 
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import DashboardShell from '../components/layout/DashboardShell';
import InstituteHeader from '../components/institute/InstituteHeader';
import InstituteStudents from '../components/institute/InstituteStudents';
import InstituteCourses from '../components/institute/InstituteCourses';
import InstituteEnquiries from '../components/institute/InstituteEnquiries';
import InstituteProfile from '../components/institute/InstituteProfile';

export default function InstituteDashboard() {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'My Students', path: '/dashboard/institute', icon: Users },
    { name: 'Courses & Batches', path: '/dashboard/institute/courses', icon: BookOpen },
    { name: 'Enquiries', path: '/dashboard/institute/enquiries', icon: MessageSquare },
    { name: 'Institute Profile', path: '/dashboard/institute/settings', icon: Settings },
  ];

  if (!user) return <Navigate to="/" />;
  if (user.role !== 'institute') return <Navigate to="/dashboard/student" />;

  return (
    <DashboardShell navItems={navItems} portalLabel="Institute Portal" variant="light">
      <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-6xl mx-auto w-full pb-12">
        <InstituteHeader />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <Routes>
              <Route path="/" element={<InstituteStudents />} />
              <Route path="/courses" element={<InstituteCourses />} />
              <Route path="/enquiries" element={<InstituteEnquiries />} />
              <Route path="/settings" element={<InstituteProfile />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}
