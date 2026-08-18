import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  Menu, 
  X, 
  Globe, 
  type LucideIcon 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export interface DashboardNavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: string | number;
}

export interface DashboardShellProps {
  navItems: DashboardNavItem[];
  portalLabel?: string;
  variant?: 'light' | 'dark';
  children?: React.ReactNode;
  headerRight?: React.ReactNode;
}

export default function DashboardShell({
  navItems,
  portalLabel = 'FutureCode AI',
  variant = 'light',
  children,
  headerRight,
}: DashboardShellProps) {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  // Close mobile menu and reset scroll on navigation
  useEffect(() => {
    setSidebarOpen(false);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isDark = variant === 'dark';

  return (
    <div className={`h-[100dvh] flex flex-col md:flex-row font-body overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      
      {/* Mobile Topbar */}
      <div className={`md:hidden px-4 py-3 flex items-center justify-between z-30 relative shadow-sm shrink-0 border-b ${
        isDark 
          ? 'bg-slate-950/95 border-slate-800 text-white' 
          : 'bg-white/95 backdrop-blur-md border-gray-200 text-slate-800'
      }`}>
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Logo" className="h-7 w-auto rounded-lg" />
          <span className="font-heading font-extrabold text-base tracking-tight">
            <span className={isDark ? 'text-white' : 'text-[#152a4f]'}>FutureCode</span>
            <span className="text-[#24a4b5]">AI</span>
          </span>
        </Link>
        
        <div className="flex items-center gap-2">
          {headerRight}
          <Link 
            to="/" 
            className={`p-2 rounded-xl border ${
              isDark 
                ? 'text-slate-400 hover:text-white bg-slate-900 border-slate-800' 
                : 'text-slate-500 hover:text-primary bg-slate-50 border-gray-100'
            }`}
            title="Main Website"
          >
            <Globe size={18} />
          </Link>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className={`p-2 rounded-xl active:scale-95 cursor-pointer ${
              isDark 
                ? 'text-slate-300 bg-slate-800' 
                : 'text-slate-700 bg-slate-100'
            }`}
            aria-label="Toggle Dashboard Menu"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Quick Tabs */}
      <div className={`md:hidden border-b px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 z-20 ${
        isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-100'
      }`}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/admin' && item.path !== '/dashboard/student' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                isActive 
                  ? 'bg-primary text-white shadow-sm shadow-primary/30' 
                  : isDark
                    ? 'bg-slate-900 text-slate-400 border border-slate-800'
                    : 'bg-slate-50 text-slate-600 border border-gray-200/80'
              }`}
            >
              <Icon size={14} />
              <span>{item.name.replace('My ', '')}</span>
              {item.badge !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-amber-400 text-slate-950 font-extrabold' : 'bg-amber-100 text-amber-900'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Mobile Backdrop for Sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed md:sticky top-0 left-0 z-50 md:z-40 h-[100dvh] w-64 flex flex-col border-r ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-300' 
                : 'bg-white border-gray-100 text-slate-700 shadow-[4px_0_24px_rgba(0,0,0,0.02)]'
            } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
          >
            {/* Sidebar Logo */}
            <div className={`h-20 flex items-center justify-between px-6 border-b shrink-0 ${
              isDark ? 'bg-slate-950/50 border-slate-800' : 'border-gray-50'
            }`}>
              <Link to="/" className="flex items-center gap-3">
                <img src="/logo.jpg" alt="Logo" className="h-9 w-auto rounded-md" />
                <div className="flex flex-col">
                  <span className="font-heading font-extrabold text-xl tracking-tight">
                    <span className={isDark ? 'text-white' : 'text-[#152a4f]'}>FutureCode</span>
                    <span className="text-[#24a4b5]">AI</span>
                  </span>
                  {portalLabel && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-slate-400'}`}>
                      {portalLabel}
                    </span>
                  )}
                </div>
              </Link>
              <button 
                className="md:hidden text-slate-400 hover:text-white"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close Sidebar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation items */}
            <nav className="flex-1 overflow-y-auto py-5 px-3 flex flex-col gap-1.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/admin/dashboard' && item.path !== '/dashboard/student' && location.pathname.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                      isActive 
                        ? isDark
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-primary text-white shadow-glow-primary'
                        : isDark
                          ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={19} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : isDark ? 'text-slate-400' : 'text-slate-500'} />
                      <span className="text-sm font-semibold">{item.name}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                        isActive 
                          ? 'bg-amber-400 text-slate-950 shadow-sm' 
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Actions Area */}
            <div className={`p-4 border-t flex flex-col gap-2 shrink-0 ${
              isDark ? 'border-slate-800' : 'border-gray-50'
            }`}>
              <Link 
                to="/"
                className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                  isDark 
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-white' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
                }`}
              >
                <Globe size={18} />
                <span>Back to Website</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer text-left"
              >
                <LogOut size={18} />
                <span>Log Out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main 
        ref={mainRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col w-full max-w-[100vw] overflow-x-hidden -webkit-overflow-scrolling-touch"
      >
        {children}
      </main>
    </div>
  );
}
