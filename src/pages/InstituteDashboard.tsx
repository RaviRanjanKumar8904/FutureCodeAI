import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  MessageSquare, 
  Settings, 
  LogOut,
  Menu,
  X,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import InstituteHeader from '../components/institute/InstituteHeader';
import InstituteStudents from '../components/institute/InstituteStudents';
import InstituteCourses from '../components/institute/InstituteCourses';
import InstituteEnquiries from '../components/institute/InstituteEnquiries';
import InstituteProfile from '../components/institute/InstituteProfile';

export default function InstituteDashboard() {
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

  const navItems = [
    { name: 'My Students', path: '/dashboard/institute', icon: Users },
    { name: 'Courses & Batches', path: '/dashboard/institute/courses', icon: BookOpen },
    { name: 'Enquiries', path: '/dashboard/institute/enquiries', icon: MessageSquare },
    { name: 'Institute Profile', path: '/dashboard/institute/settings', icon: Settings },
  ];

  if (!user) return <Navigate to="/" />;
  if (user.role !== 'institute') return <Navigate to="/dashboard/student" />;

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
              <div className="px-4 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Institute Portal
              </div>
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
          <InstituteHeader />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
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
