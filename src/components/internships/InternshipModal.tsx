import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, GraduationCap, Briefcase, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
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
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-3xl max-h-[92dvh] bg-white rounded-3xl sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col z-10 border border-slate-100"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-[#152a4f] p-5 sm:p-7 md:p-8 shrink-0 text-white">
              <button 
                onClick={onClose}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/10 hover:bg-white text-white hover:text-slate-950 backdrop-blur-md p-2 rounded-full transition-colors cursor-pointer active:scale-90 z-20"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
              <div className="inline-block bg-primary text-white text-[10px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-full mb-2 uppercase tracking-wider">
                {internship.domain}
              </div>
              <h2 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">{internship.title}</h2>
            </div>

            {/* Scrollable Body */}
            <div className="flex-grow overflow-y-auto p-4 sm:p-6 md:p-8 scrollbar-none space-y-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                
                {/* Main Content (Left) */}
                <div className="w-full lg:w-2/3 space-y-5">
                  <section>
                    <h3 className="text-base sm:text-lg font-bold text-text-heading mb-1.5">Role Overview</h3>
                    <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">{internship.description}</p>
                  </section>

                  <section>
                    <h3 className="text-base sm:text-lg font-bold text-text-heading mb-2">Skills Required</h3>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {internship.skills.map((skill, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-primary" />
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Sidebar Info (Right) */}
                <div className="w-full lg:w-1/3">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-xs text-xs sm:text-sm">
                    <div className="flex items-start gap-2.5">
                      <Clock className="text-primary mt-0.5 shrink-0" size={16} />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
                        <p className="font-extrabold text-text-heading">{internship.duration}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <GraduationCap className="text-secondary mt-0.5 shrink-0" size={16} />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Eligibility</p>
                        <p className="font-extrabold text-text-heading">{internship.eligibility}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Briefcase className="text-indigo-500 mt-0.5 shrink-0" size={16} />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stipend / Comp</p>
                        <p className="font-extrabold text-text-heading">{internship.stipend}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Calendar className="text-red-500 mt-0.5 shrink-0" size={16} />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Apply Before</p>
                        <p className="font-extrabold text-text-heading">{internship.deadline}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
              </div>
            </div>

            {/* Sticky Mobile & Desktop Footer */}
            <div className="p-3 sm:p-4 bg-slate-50/90 backdrop-blur-md border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  onClose();
                  onApply({ id: internship.id, title: internship.title });
                }}
                className="flex-1 sm:flex-initial bg-primary hover:bg-indigo-600 text-white px-6 py-2.5 sm:py-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-glow-primary flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Apply for Internship</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
