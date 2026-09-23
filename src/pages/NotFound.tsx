import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col font-sans relative overflow-hidden">
      <SEO 
        title="404 - Page Not Found" 
        description="The requested page could not be found or has been moved." 
        noIndex={true} 
      />
      
      {/* Decorative gradient background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] -z-10 mix-blend-multiply" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-purple-500/20 rounded-full blur-[120px] -z-10 mix-blend-multiply" />

      <main className="flex-1 flex items-center justify-center p-6 mt-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl w-full text-center"
        >
          <div className="relative inline-block">
            <motion.h1 
              className="text-[12rem] leading-none font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600 select-none drop-shadow-sm"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            >
              404
            </motion.h1>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-4 -right-12 text-6xl"
            >
              ✨
            </motion.div>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-4 mb-6">
            Page Not Found
          </h2>
          
          <p className="text-lg text-slate-600 mb-10 max-w-lg mx-auto">
            The page you're looking for has moved into a different dimension, or perhaps it never existed at all.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/25"
            >
              <Home size={18} />
              Return Home
            </Link>
            <button 
              onClick={() => window.history.back()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-8 py-3.5 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <ArrowLeft size={18} />
              Go Back
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
