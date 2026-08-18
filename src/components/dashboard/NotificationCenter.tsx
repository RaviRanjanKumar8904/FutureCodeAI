import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  CheckCheck, 
  Award, 
  CheckCircle2, 
  MessageSquare, 
  Video, 
  ExternalLink,
  Sparkles,
  X
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import type { AppNotification } from '../../utils/notificationService';

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !user.email) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const emailLower = user.email.toLowerCase().trim();
    const notifQ = query(
      collection(db, 'notifications'),
      where('userEmail', '==', emailLower),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      notifQ,
      snapshot => {
        const list = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as AppNotification[];
        setNotifications(list);
        setLoading(false);
      },
      error => {
        console.warn('[NotificationCenter Listener]:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id?: string) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.warn('[NotificationCenter] Error marking read:', err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read && n.id);
    if (!unread.length) return;

    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id!), { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.warn('[NotificationCenter] Error marking all read:', err);
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Recent';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'certificate':
        return <Award className="w-5 h-5 text-amber-500" />;
      case 'attendance':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'enquiry':
        return <MessageSquare className="w-5 h-5 text-sky-500" />;
      case 'webinar':
        return <Video className="w-5 h-5 text-indigo-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-primary" />;
    }
  };

  if (!user) return null;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-gray-200/80 text-slate-700 hover:text-primary transition-all duration-200 shadow-sm cursor-pointer active:scale-95"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 z-[120] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-semibold text-primary hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading notifications…</div>
              ) : notifications.length === 0 ? (
                <div className="py-10 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No notifications yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    We will notify you when certificates are issued or attendance is updated!
                  </p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 flex items-start gap-3 transition-colors cursor-pointer text-left ${
                      notif.read ? 'bg-white hover:bg-slate-50' : 'bg-primary/5 hover:bg-primary/10'
                    }`}
                  >
                    {/* Type Icon */}
                    <div className="p-2 rounded-2xl bg-white shadow-xs border border-gray-100 shrink-0 mt-0.5">
                      {getIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed break-words line-clamp-2">
                        {notif.message}
                      </p>
                      {notif.link && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-primary">
                          <span>View details</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Unread indicator */}
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 shadow-xs" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
