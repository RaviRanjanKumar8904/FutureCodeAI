import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, ShieldCheck, LogOut, LayoutDashboard, 
  Home, BookOpen, Briefcase, Building2, Image, User as UserIcon, ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import UserAvatar from './UserAvatar';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  // Hide on dashboard AFTER hooks
  if (
    location.pathname.startsWith('/dashboard/student') || 
    location.pathname.startsWith('/dashboard/institute') ||
    location.pathname.startsWith('/dashboard/staff') ||
    location.pathname.startsWith('/admin')
  ) {
    return null;
  }

  const navLinks = [
    { name: 'Home', path: '/', icon: <Home size={18} /> },
    { name: 'Programs', path: '/programs', icon: <BookOpen size={18} /> },
    { name: 'Internships', path: '/internships', icon: <Briefcase size={18} /> },
    { name: 'Tests', path: user?.role === 'admin' ? '/admin/tests' : '/dashboard/student/tests', icon: <ClipboardCheck size={18} /> },
    { name: 'Collaborators', path: '/collaborators', icon: <Building2 size={18} /> },
    { name: 'Gallery', path: '/gallery', icon: <Image size={18} /> }
  ];

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'institute') return '/dashboard/institute';
    if (user.role === 'staff') return '/dashboard/staff';
    return '/dashboard/student';
  };

  return (
    <header 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'glass py-2.5 sm:py-3 shadow-sm' : 'bg-transparent py-3 sm:py-5'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 group-hover:shadow-md transition-all shrink-0">
              <img src="/logo.webp" alt="FutureCodeAI Logo" width={36} height={36} className="h-7 sm:h-9 w-auto mix-blend-multiply" />
            </div>
            <span className="font-heading font-extrabold text-lg sm:text-2xl tracking-tight">
              <span className="text-[#152a4f]">FutureCode</span>
              <span className="text-[#24a4b5]">AI</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-7">
            {navLinks.map((link) => {
              const isActive = link.path === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(link.path);
              const isTests = link.name === 'Tests';

              if (isTests) {
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className="relative group px-3.5 py-1.5 rounded-full transition-all duration-300 flex items-center gap-1.5 overflow-visible select-none"
                  >
                    {/* Animated Pulsing Radial Glow Backdrop */}
                    <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500/30 via-purple-500/40 to-pink-500/30 blur-md opacity-75 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 animate-pulse pointer-events-none" />
                    
                    {/* Glowing Pill Outline with Luminous Box Shadow */}
                    <span className="absolute inset-0 rounded-full bg-white/80 backdrop-blur-sm border border-indigo-300/80 group-hover:border-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.45)] group-hover:shadow-[0_0_22px_rgba(168,85,247,0.75)] transition-all duration-300" />
                    
                    {/* Text with Glowing Gradient & Radar Ping Dot */}
                    <span className="relative z-10 text-sm font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:from-indigo-500 group-hover:to-pink-500 flex items-center gap-1.5 transition-all">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.9)]" />
                      </span>
                      {link.name}
                    </span>

                    {isActive && (
                      <motion.div 
                        layoutId="navbar-indicator"
                        className="absolute -bottom-1.5 left-2 right-2 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.9)]"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              }

              return (
                <Link 
                  key={link.name} 
                  to={link.path}
                  className={`text-sm transition-all duration-300 relative py-1 ${isActive ? 'text-primary font-bold' : 'font-medium text-slate-600 hover:text-primary'}`}
                >
                  {link.name}
                  {isActive && (
                    <motion.div 
                      layoutId="navbar-indicator"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            <Link to="/verify" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-primary transition-colors">
              <ShieldCheck size={16} className="text-primary" />
              Verify Certificate
            </Link>
            <div className="w-px h-5 bg-gray-200/80 mx-1"></div>
            
            {user ? (
              <div className="flex items-center gap-3">
                <Link 
                  to={getDashboardPath()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition-all hover:-translate-y-0.5 active:scale-95 ${
                    user.role === 'admin' 
                      ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/30' 
                      : 'bg-primary text-white hover:bg-indigo-600 shadow-glow-primary'
                  }`}
                >
                  <LayoutDashboard size={16} />
                  {user.role === 'admin' ? 'Admin Panel' : user.role === 'staff' ? 'Staff Portal' : user.role === 'institute' ? 'Center Portal' : 'My Dashboard'}
                </Link>

                <div className="relative">
                  <button 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 p-0.5 rounded-full border border-gray-200 hover:border-primary transition-colors cursor-pointer"
                  >
                    <UserAvatar 
                      photoURL={user.photoURL}
                      name={user.displayName}
                      email={user.email}
                      size="sm"
                    />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50"
                      >
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="font-bold text-sm text-text-heading truncate">{user.displayName || 'User'}</p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                        <Link 
                          to={getDashboardPath()}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
                        >
                          <LayoutDashboard size={16} />
                          {user.role === 'admin' ? 'Admin Panel' : user.role === 'staff' ? 'Staff Portal' : user.role === 'institute' ? 'Center Portal' : 'My Dashboard'}
                        </Link>
                        {user.role === 'student' && (
                          <>
                            <Link 
                              to="/dashboard/student/tests"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
                            >
                              <ClipboardCheck size={16} />
                              My Tests
                            </Link>
                            <Link 
                              to="/dashboard/student/settings"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
                            >
                              <UserIcon size={16} />
                              Profile Settings
                            </Link>
                          </>
                        )}
                        <button 
                          onClick={() => {
                            logout();
                            setDropdownOpen(false);
                          }}
                          className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="bg-primary text-white px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm hover:bg-indigo-600 transition-all shadow-glow-primary hover:-translate-y-0.5 active:scale-95"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Right Controls: Verify Badge + Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link 
              to="/verify" 
              className="px-3 py-2 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20 text-xs font-bold flex items-center gap-1 active:scale-95 min-h-[40px]"
            >
              <ShieldCheck size={14} className="text-amber-600" />
              Verify
            </Link>

            <button 
              type="button"
              aria-label="Toggle Navigation Menu"
              className="w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-800 hover:text-primary active:scale-90 transition-all cursor-pointer shrink-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 top-[60px] sm:top-[68px] bg-slate-950/40 backdrop-blur-sm md:hidden z-40"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 w-full bg-white/95 backdrop-blur-2xl shadow-2xl border-b border-gray-100 p-5 md:hidden flex flex-col gap-3 z-50 rounded-b-3xl max-h-[calc(100vh-70px)] overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {/* User Profile Card on Mobile if authenticated */}
              {user && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-slate-50 border border-indigo-100/80 flex items-center justify-between mb-1 min-h-[52px]">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar 
                      photoURL={user.photoURL}
                      name={user.displayName}
                      email={user.email}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm text-slate-900 truncate">{user.displayName || 'Logged In User'}</p>
                      <p className="text-[11px] text-slate-500 truncate font-medium">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
                    {user.role}
                  </span>
                </div>
              )}

              {/* Navigation Links */}
              <div className="space-y-1.5">
                {navLinks.map((link) => {
                  const isActive = link.path === '/' 
                    ? location.pathname === '/' 
                    : location.pathname.startsWith(link.path);
                  const isTests = link.name === 'Tests';

                  if (isTests) {
                    return (
                      <Link 
                        key={link.name} 
                        to={link.path}
                        className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all relative overflow-hidden min-h-[48px] ${
                          isActive 
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30' 
                            : 'bg-gradient-to-r from-indigo-50/80 via-purple-50/80 to-pink-50/80 text-indigo-700 border border-indigo-200/80 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="flex items-center gap-3">
                          <span className={isActive ? 'text-white' : 'text-indigo-600'}>{link.icon}</span>
                          <span className="font-extrabold">{link.name}</span>
                        </div>
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-700 border border-indigo-300/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping" />
                          Live
                        </span>
                      </Link>
                    );
                  }

                  return (
                    <Link 
                      key={link.name} 
                      to={link.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-colors min-h-[48px] ${
                        isActive 
                          ? 'bg-primary text-white shadow-md shadow-primary/20' 
                          : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className={isActive ? 'text-white' : 'text-slate-400'}>{link.icon}</span>
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="h-px bg-gray-100 my-1" />

              {/* Verify Certificate Mobile Action */}
              <Link 
                to="/verify" 
                className="flex items-center justify-center gap-2 text-sm font-extrabold text-amber-900 bg-amber-500/15 border border-amber-500/30 py-3 rounded-2xl hover:bg-amber-500/20 active:scale-95 transition-all min-h-[48px]"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShieldCheck size={18} className="text-amber-600" />
                Verify Certificate
              </Link>

              {/* Auth Controls */}
              {user ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link 
                    to={getDashboardPath()} 
                    className={`flex items-center justify-center gap-2 text-xs sm:text-sm font-bold py-3 rounded-2xl shadow-sm text-white active:scale-95 min-h-[48px] ${
                      user.role === 'admin' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-indigo-600'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard size={16} />
                    {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                  </Link>

                  <button 
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95 border border-slate-200/60 min-h-[48px]"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link 
                    to="/login"
                    className="text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-center py-3 rounded-2xl transition-colors active:scale-95 flex items-center justify-center gap-1.5 min-h-[48px]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <UserIcon size={16} />
                    Log in
                  </Link>
                  <Link 
                    to="/login" 
                    className="bg-primary text-white text-center py-3 rounded-2xl text-xs sm:text-sm font-extrabold shadow-glow-primary active:scale-95 transition-all flex items-center justify-center min-h-[48px]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
