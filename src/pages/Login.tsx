import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Shield, Lock, GraduationCap, Building2, ArrowRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import SEO from '../components/SEO';

type Role = 'student' | 'institute' | 'staff';

export default function Login() {
  const navigate = useNavigate();
  const { user, signInWithOAuth } = useAuth();
  
  const [role, setRole] = useState<Role>('student');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGithub, setLoadingGithub] = useState(false);

  useEffect(() => {
    if (user) {
      // Always send users to the home page after login (ignore saved "from" state)
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    if (provider === 'google') setLoadingGoogle(true);
    if (provider === 'github') setLoadingGithub(true);

    try {
      await signInWithOAuth(role, provider);
      toast.success('Successfully logged in!', { duration: 3000 });
      // The useEffect will handle the redirect once user state is updated
    } catch (error: any) {
      if (error.message === 'access_denied') {
        toast.error('Access Denied — Admin accounts are invite-only', { 
          duration: 5000,
          style: { background: '#fee2e2', color: '#991b1b', fontWeight: 'bold' },
          icon: '🛑'
        });
      } else if (error.message === 'pending_verification') {
        toast('Your institute account is pending admin approval', { 
          duration: 5000,
          style: { background: '#fef3c7', color: '#92400e', fontWeight: 'bold' },
          icon: '⏳'
        });
      } else {
        console.error(error);
        toast.error(`Sign in failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoadingGoogle(false);
      setLoadingGithub(false);
    }
  };

  const tabs = [
    { id: 'student', label: 'Student', icon: GraduationCap },
    { id: 'institute', label: 'Institute', icon: Building2 },
    { id: 'staff', label: 'Staff', icon: Shield },
  ];

  return (
    <div className="min-h-screen pt-20 bg-slate-50 flex items-center justify-center relative overflow-hidden font-body text-slate-900">
      <SEO 
        title="Login / Sign In" 
        description="Access your FutureCodeAI dashboard. Secure login for students, institutes, staff, and administrators."
      />
      <Toaster position="top-center" />
      
      {/* 3D Animated Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center">
        {/* Glow Blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-200/40 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-200/30 rounded-full blur-[100px]" />
        
        {/* Floating Shield 3D Effect */}
        <motion.div
          animate={{ 
            y: [-20, 20, -20],
            rotateX: [10, -10, 10],
            rotateY: [-10, 10, -10]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="hidden md:block absolute -left-12 md:left-24 top-1/3 opacity-30 text-primary drop-shadow-[0_0_30px_rgba(36,164,181,0.5)]"
          style={{ perspective: 1000 }}
        >
          <Shield size={180} strokeWidth={1} />
        </motion.div>

        {/* Floating Lock 3D Effect */}
        <motion.div
          animate={{ 
            y: [20, -20, 20],
            rotateX: [-15, 15, -15],
            rotateY: [15, -15, 15]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="hidden md:block absolute -right-12 md:right-24 bottom-1/3 opacity-30 text-indigo-400 drop-shadow-[0_0_30px_rgba(99,102,241,0.5)]"
          style={{ perspective: 1000 }}
        >
          <Lock size={140} strokeWidth={1} />
        </motion.div>
      </div>

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', damping: 25 }}
        className="w-full max-w-md mx-4 bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-[0_35px_60px_-30px_rgba(15,23,42,0.15)] relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg shadow-sky-200/40 mb-6 overflow-hidden">
            <img src="/logo.webp" alt="FutureCodeAI Logo" width={48} height={48} className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 mb-2 tracking-tight">Welcome</h1>
          <p className="text-xs sm:text-base text-slate-600 font-medium">Sign in to access your FutureCodeAI portal</p>
        </div>

        {/* Role Tabs */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center mb-8 border border-slate-200 relative">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = role === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setRole(tab.id as Role)}
                className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 relative z-10 min-h-[44px] active:scale-95 cursor-pointer ${
                  isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                }`}
              >
                <Icon size={16} className="sm:w-4 sm:h-4 w-5 h-5 shrink-0" />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white border border-slate-200 rounded-xl -z-10 shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-4">
          <button 
            onClick={() => handleOAuthLogin('google')}
            disabled={loadingGoogle || loadingGithub}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 py-3.5 px-4 rounded-xl font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
          >
            {loadingGoogle ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
                <ArrowRight className="absolute right-4 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-400" size={20} />
              </>
            )}
          </button>
          
          <button 
            onClick={() => handleOAuthLogin('github')}
            disabled={loadingGoogle || loadingGithub}
            className="w-full flex items-center justify-center gap-3 bg-slate-800 text-white hover:bg-slate-700 py-3.5 px-4 rounded-xl font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
          >
            {loadingGithub ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" fill="currentColor"/>
                </svg>
                Continue with GitHub
                <ArrowRight className="absolute right-4 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-200" size={20} />
              </>
            )}
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400 font-medium">
          By continuing, you agree to our <a href="#" className="text-primary hover:underline">Terms of Service</a> & <a href="#" className="text-primary hover:underline">Privacy Policy</a>
        </p>
      </motion.div>
    </div>
  );
}
