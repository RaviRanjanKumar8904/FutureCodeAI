import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { 
  BookOpen, 
  Award, 
  Briefcase, 
  MessageSquare, 
  Settings, 
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';

import DashboardShell from '../components/layout/DashboardShell';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import MyCourses from '../components/dashboard/MyCourses';
import MyCertificates from '../components/dashboard/MyCertificates';
import MyInternships from '../components/dashboard/MyInternships';
import MyWebinars from '../components/dashboard/MyWebinars';
import MyEnquiries from '../components/dashboard/MyEnquiries';
import ProfileSettings from '../components/dashboard/ProfileSettings';

import NotificationCenter from '../components/dashboard/NotificationCenter';

export default function StudentDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [certCount, setCertCount] = useState(0);
  const [webinarCount, setWebinarCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      try {
        const userEmailClean = (user.email || '').toLowerCase().trim();
        const promises = [
          getDocs(query(collection(db, 'certificates'), where('studentEmail', '==', userEmailClean))),
          getDocs(query(collection(db, 'webinars'), where('status', 'in', ['Live', 'Upcoming']))),
        ];
        if (user.uid) {
          promises.push(getDocs(query(collection(db, 'certificates'), where('studentId', '==', user.uid))));
        }

        const [certSnap, webinarSnap, certUidSnap] = await Promise.all(promises);

        const certMap = new Map<string, any>();
        certSnap.docs.forEach(d => certMap.set(d.id, d.data()));
        if (certUidSnap) {
          certUidSnap.docs.forEach(d => certMap.set(d.id, d.data()));
        }

        const count = Array.from(certMap.values()).filter(c => !c.revoked).length;
        setCertCount(count);
        setWebinarCount(webinarSnap.docs.length);
      } catch (err) {
        console.error("Error fetching dashboard counts:", err);
      }
    };
    fetchCounts();
  }, [user]);

  const navItems = [
    { name: 'My Courses', path: '/dashboard/student', icon: BookOpen },
    { name: 'My Webinars', path: '/dashboard/student/webinars', icon: Video, badge: webinarCount > 0 ? webinarCount : undefined },
    { name: 'My Certificates', path: '/dashboard/student/certificates', icon: Award, badge: certCount > 0 ? certCount : undefined },
    { name: 'My Internship', path: '/dashboard/student/internships', icon: Briefcase },
    { name: 'My Enquiries', path: '/dashboard/student/enquiries', icon: MessageSquare },
    { name: 'Profile Settings', path: '/dashboard/student/settings', icon: Settings },
  ];

  if (!user) return <Navigate to="/" />;

  return (
    <DashboardShell 
      navItems={navItems} 
      portalLabel="Student Portal" 
      variant="light"
      headerRight={<NotificationCenter />}
    >
      <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-6xl mx-auto w-full pb-12">
        <DashboardHeader />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <Routes>
              <Route path="/" element={<MyCourses />} />
              <Route path="/webinars" element={<MyWebinars />} />
              <Route path="/certificates" element={<MyCertificates />} />
              <Route path="/internships" element={<MyInternships />} />
              <Route path="/enquiries" element={<MyEnquiries />} />
              <Route path="/settings" element={<ProfileSettings />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}
