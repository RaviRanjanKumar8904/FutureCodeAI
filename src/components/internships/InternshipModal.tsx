import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, GraduationCap, Briefcase, Calendar, CheckCircle2 } from 'lucide-react';
import type { InternshipData } from './InternshipCard';

interface InternshipModalProps {
  internship: InternshipData | null;
  onClose: () => void;
  onApply: (target: { id: string, title: string }) => void;
}

export default function InternshipModal({ internship, onClose, onApply }: InternshipModalProps) {
  return (
    <AnimatePresence>
      {internship && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, y: 25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[min(100%,calc(100vw-1.5rem))] max-w-4xl max-h-[calc(100vh-1.5rem)] bg-white rounded-[1.5rem] shadow-[0_28px_70px_-30px_rgba(15,23,42,0.45)] overflow-hidden flex flex-col z-10"
          >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-slate-900 to-[#152a4f] p-6 sm:p-8 md:p-12 shrink-0">
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-slate-950/20 hover:bg-white text-white hover:text-slate-950 backdrop-blur-md p-2 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="inline-block bg-primary text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-[0.22em]">
              {internship.domain}
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white leading-tight">{internship.title}</h2>
          </div>

          {/* Scrollable Body */}
          <div className="flex-grow overflow-y-auto p-4 sm:p-6 md:p-8 scrollbar-hide">
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
              
              {/* Main Content (Left) */}
              <div className="w-full lg:w-2/3 space-y-8">
                <section>
                  <h3 className="text-2xl font-bold text-text-heading mb-4">Role Overview</h3>
                  <p className="text-slate-600 leading-relaxed text-lg">{internship.description}</p>
                </section>

                <section>
                  <h3 className="text-2xl font-bold text-text-heading mb-4">Skills Required</h3>
                  <div className="flex flex-wrap gap-2">
                    {internship.skills.map((skill, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-primary" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              </div>

              {/* Sidebar (Right) */}
              <div className="w-full lg:w-1/3">
                <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 sm:p-6 lg:p-6 lg:sticky lg:top-6 space-y-5 shadow-soft-lg">
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Clock className="text-primary mt-1" size={20} />
                      <div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Duration</p>
                        <p className="font-bold text-text-heading">{internship.duration}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <GraduationCap className="text-secondary mt-1" size={20} />
                      <div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Eligibility</p>
                        <p className="font-bold text-text-heading">{internship.eligibility}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Briefcase className="text-indigo-500 mt-1" size={20} />
                      <div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Stipend / Comp</p>
                        <p className="font-bold text-text-heading">{internship.stipend}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="text-red-500 mt-1" size={20} />
                      <div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Apply Before</p>
                        <p className="font-bold text-text-heading">{internship.deadline}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <button 
                      onClick={() => {
                        onClose();
                        onApply({ id: internship.id, title: internship.title });
                      }}
                      className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-600 transition-colors shadow-glow-primary"
                    >
                      Apply Now
                    </button>
                  </div>
                  
                </div>
              </div>
              
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
