import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';

export default function DashboardHeader() {
  const { user } = useAuth();

  if (!user) return null;

  // Calculate profile completion
  const fields = [user.phone, user.school, user.city, user.degree, user.yearOfStudy, user.githubUrl, user.linkedinUrl];
  const filledFields = fields.filter(field => field && field.trim().length > 0).length;
  const completionPercentage = Math.round(((filledFields + 2) / 9) * 100); // base 2 for name & email

  const firstName = (user.displayName || user.email || 'Student').split(' ')[0];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-5 sm:p-7 md:p-8 shadow-sm border border-gray-100 mb-6 sm:mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative overflow-hidden text-center sm:text-left"
    >
      {/* Decorative background blob */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Avatar */}
      <div className="relative z-10 shrink-0">
        {user.photoURL ? (
          <img 
            src={user.photoURL} 
            alt={user.displayName || 'User'} 
            className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-md bg-slate-100 object-cover"
          />
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-md bg-indigo-600 text-white flex items-center justify-center font-extrabold text-2xl">
            {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 z-10 w-full">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-text-heading mb-1">
          Welcome back, {firstName}! 👋
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-4 sm:mb-5">
          Ready to continue your learning journey and projects?
        </p>

        {/* Progress Bar */}
        {completionPercentage < 100 && (
          <div className="max-w-md w-full bg-slate-50 p-3 sm:p-4 rounded-2xl border border-gray-100 mx-auto sm:mx-0">
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-xs sm:text-sm font-bold text-slate-700">Profile Completion</span>
              <span className="text-xs sm:text-sm font-extrabold text-primary">{completionPercentage}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${completionPercentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full"
              />
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 font-medium">
              Complete your profile in Settings to unlock personalized certificates &amp; recommendations.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
