import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Briefcase, 
  MessageSquare, 
  Award, 
  Image as ImageIcon, 
  ShieldAlert,
  LogOut,
  Building2,
  ListOrdered,
  Menu,
  X
} from 'lucide-react';

const ADMIN_NAV = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Enquiries', path: '/admin/enquiries', icon: MessageSquare },
  { name: 'Collaborators', path: '/admin/collaborators', icon: Building2 },
  { name: 'Admins', path: '/admin/admins', icon: ShieldAlert },
  { name: 'Staff', path: '/admin/staff', icon: Users },
  // Future sections placeholder:
  { name: 'Courses', path: '/admin/courses', icon: BookOpen },
  { name: 'Internships', path: '/admin/internships', icon: Briefcase },
  { name: 'Students', path: '/admin/students', icon: Users },
  { name: 'Certificates', path: '/admin/certificates', icon: Award },
  { name: 'Gallery', path: '/admin/gallery', icon: ImageIcon },
  { name: 'Activity Log', path: '/admin/logs', icon: ListOrdered },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'admin') {
    return null; // Don't render anything while redirecting
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="h-[100dvh] bg-slate-50 flex">
      {/* Mobile Sidebar Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-slate-900 text-slate-300 flex flex-col fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-6 bg-slate-950/50 border-b border-slate-800">
          <span className="text-white font-extrabold text-xl tracking-tight">Admin Panel</span>
          <button 
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {ADMIN_NAV.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-indigo-500 text-white shadow-md' 
                        : 'hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content area */}
      <div className="flex-1 md:ml-64 flex flex-col h-[100dvh] w-full">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden text-slate-600 hover:text-indigo-600 p-1"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 capitalize truncate max-w-[150px] sm:max-w-none">
              {location.pathname.split('/').pop() || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-xs sm:text-sm font-medium text-slate-600 hidden sm:inline-block">Logged in as <strong className="text-slate-900">{user.email}</strong></span>
            {user.photoURL ? (
              <img src={user.photoURL} alt="Admin" className="w-8 h-8 rounded-full border border-gray-200" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                {user.displayName?.charAt(0) || 'A'}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 w-full max-w-[100vw] overflow-x-hidden -webkit-overflow-scrolling-touch">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
