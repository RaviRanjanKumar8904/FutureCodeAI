import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  Building2,
  ListOrdered,
  Video
} from 'lucide-react';
import DashboardShell from '../components/layout/DashboardShell';

const ADMIN_NAV = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Enquiries', path: '/admin/enquiries', icon: MessageSquare },
  { name: 'Collaborators', path: '/admin/collaborators', icon: Building2 },
  { name: 'Admins', path: '/admin/admins', icon: ShieldAlert },
  { name: 'Staff', path: '/admin/staff', icon: Users },
  { name: 'Courses', path: '/admin/courses', icon: BookOpen },
  { name: 'Internships', path: '/admin/internships', icon: Briefcase },
  { name: 'Students', path: '/admin/students', icon: Users },
  { name: 'Webinars', path: '/admin/webinars', icon: Video },
  { name: 'Certificates', path: '/admin/certificates', icon: Award },
  { name: 'Gallery', path: '/admin/gallery', icon: ImageIcon },
  { name: 'Activity Log', path: '/admin/logs', icon: ListOrdered },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
    return null;
  }

  const pageTitle = location.pathname.split('/').pop() || 'Dashboard';

  return (
    <DashboardShell navItems={ADMIN_NAV} portalLabel="Admin Panel" variant="dark">
      {/* Topbar */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 capitalize truncate max-w-[150px] sm:max-w-none">
            {pageTitle}
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
      <div className="p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 w-full max-w-[100vw] overflow-x-hidden">
        <Outlet />
      </div>
    </DashboardShell>
  );
}
