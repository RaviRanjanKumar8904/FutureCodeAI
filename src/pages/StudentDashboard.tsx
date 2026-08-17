import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  BookOpen, 
  Award, 
  Briefcase, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Globe 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

import DashboardHeader from '../components/dashboard/DashboardHeader';
import MyCourses from '../components/dashboard/MyCourses';
import MyCertificates from '../components/dashboard/MyCertificates';
import MyInternships from '../components/dashboard/MyInternships';
import MyEnquiries from '../components/dashboard/MyEnquiries';
import ProfileSettings from '../components/dashboard/ProfileSettings';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [certCount, setCertCount] = useState(0);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setSidebarOpen(false);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    const fetchCertCount = async () => {
      try {
        const snap = await getDocs(collection(db, 'certificates'));
        const userEmailClean = (user.email || '').toLowerCase().trim();
        const userNameClean = (user.displayName || '').toLowerCase().trim();
        const count = snap.docs.filter(d => {
          const c = d.data();
          if (c.revoked) return false;
          const cEmail = (c.studentEmail || '').toLowerCase().trim();
          const cName = (c.studentName || '').toLowerCase().trim();
          return (userEmailClean && cEmail === userEmailClean) || (user.uid && c.studentId === user.uid) || (userNameClean && cName === userNameClean);
        }).length;
        setCertCount(count);
      } catch (err) {
        console.error("Error fetching cert count:", err);
      }
    };
    fetchCertCount();
  }, [user]);

  const navItems = [
    { name: 'My Courses', path: '/dashboard/student', icon: BookOpen },
    { name: 'My Certificates', path: '/dashboard/student/certificates', icon: Award, badge: certCount > 0 ? certCount : undefined },
    { name: 'My Internship', path: '/dashboard/student/internships', icon: Briefcase },
    { name: 'My Enquiries', path: '/dashboard/student/enquiries', icon: MessageSquare },
    { name: 'Profile Settings', path: '/dashboard/student/settings', icon: Settings },
  ];

  if (!user) return <Navigate to="/" />;

  return (
    <div className="h-[100dvh] bg-slate-50 flex flex-col md:flex-row font-body">
      
      {/* Mobile Topbar */}
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

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed md:sticky top-0 left-0 z-40 h-[100dvh] w-64 bg-white border-r border-gray-100 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}
          >
            {/* Sidebar Logo */}
            <div className="hidden md:flex h-20 items-center px-6 border-b border-gray-50">
              <Link to="/" className="flex items-center gap-3">
                <img src="/logo.jpg" alt="Logo" className="h-9 w-auto rounded-md" />
                <span className="font-heading font-extrabold text-xl tracking-tight">
                  <span className="text-[#152a4f]">FutureCode</span>
                  <span className="text-[#24a4b5]">AI</span>
                </span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl font-medium transition-all ${
                      isActive 
                        ? 'bg-primary text-white shadow-glow-primary' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${isActive ? 'bg-amber-400 text-slate-950 shadow-sm' : 'bg-amber-100 text-amber-900 border border-amber-200'}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* User Bottom Area */}
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

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 min-w-0 min-h-0 overflow-y-auto overscroll-contain scroll-smooth -webkit-overflow-scrolling-touch">
        <div className="p-4 md:p-8 lg:p-10 max-w-6xl mx-auto w-full pb-8">
          <DashboardHeader />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Routes>
                <Route path="/" element={<MyCourses />} />
                <Route path="/certificates" element={<MyCertificates />} />
                <Route path="/internships" element={<MyInternships />} />
                <Route path="/enquiries" element={<MyEnquiries />} />
                <Route path="/settings" element={<ProfileSettings />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      
      {/* Mobile Backdrop */}
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
