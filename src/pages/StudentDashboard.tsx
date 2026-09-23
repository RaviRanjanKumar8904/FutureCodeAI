import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { 
  BookOpen, 
  Award, 
  Briefcase, 
  MessageSquare, 
  Settings, 
  Video,
  ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { lazy, Suspense } from 'react';
import DashboardShell from '../components/layout/DashboardShell';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import NotificationCenter from '../components/dashboard/NotificationCenter';

const MyCourses = lazy(() => import('../components/dashboard/MyCourses'));
const MyCertificates = lazy(() => import('../components/dashboard/MyCertificates'));
const MyInternships = lazy(() => import('../components/dashboard/MyInternships'));
const MyWebinars = lazy(() => import('../components/dashboard/MyWebinars'));
const MyEnquiries = lazy(() => import('../components/dashboard/MyEnquiries'));
const ProfileSettings = lazy(() => import('../components/dashboard/ProfileSettings'));
const MyTests = lazy(() => import('../components/dashboard/MyTests'));
const TakeTest = lazy(() => import('../components/dashboard/TakeTest'));
const TestResult = lazy(() => import('../components/dashboard/TestResult'));

function DashboardTabLoader() {
  return (
    <div className="py-20 flex justify-center items-center">
      <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary border-t-transparent" />
    </div>
  );
}

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
    { name: 'My Tests', path: '/dashboard/student/tests', icon: ClipboardCheck },
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
            <Suspense fallback={<DashboardTabLoader />}>
              <Routes>
                <Route path="/" element={<MyCourses />} />
                <Route path="/webinars" element={<MyWebinars />} />
                <Route path="/certificates" element={<MyCertificates />} />
                <Route path="/internships" element={<MyInternships />} />
                <Route path="/tests" element={<MyTests />} />
                <Route path="/tests/:testId" element={<TakeTest />} />
                <Route path="/tests/:testId/result/:attemptId" element={<TestResult />} />
                <Route path="/enquiries" element={<MyEnquiries />} />
                <Route path="/settings" element={<ProfileSettings />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}
