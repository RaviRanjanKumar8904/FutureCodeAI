import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, ChevronDown, CheckCircle2, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import type { CourseData } from './CourseCard';

interface CourseModalProps {
  course: CourseData | null;
  onClose: () => void;
  onEnquire: (target: { id: string; title: string }) => void;
}

export default function CourseModal({ course, onClose, onEnquire }: CourseModalProps) {
  const [openAccordion, setOpenAccordion] = useState<number | null>(0);

  if (!course) return null;

  const syllabusList = (course.syllabus && course.syllabus.length > 0) ? course.syllabus : [
    {
      title: 'Module 1: Foundations & Core Architecture',
      topics: ['Fundamentals & Modern Setup', 'Component Design & Data Flow', 'Hands-on Coding Labs & Best Practices']
    },
    {
      title: 'Module 2: Advanced Topics & Real-world Implementation',
      topics: ['Full-stack Integration', 'State Management & Optimization', 'Production Deployment & Cloud Tools']
    },
    {
      title: 'Module 3: Capstone Project & Industry Assessment',
      topics: ['Live Industry Project', 'Code Reviews & Mentorship', 'Portfolio Preparation & Certification']
    }
  ];

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-4xl max-h-[92dvh] bg-white rounded-3xl sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col z-10 border border-slate-100"
        >
          {/* Header Image */}
          <div className="relative h-36 sm:h-48 md:h-56 shrink-0 bg-slate-900">
            <img src={course.thumbnailUrl || '/logo.jpg'} alt={course.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-black/40 hover:bg-white text-white hover:text-slate-950 backdrop-blur-md p-2 rounded-full transition-colors cursor-pointer z-20 shadow-md active:scale-90"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
            <div className="absolute bottom-3 left-4 sm:left-6 right-4">
              <div className="inline-block bg-primary text-white text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full mb-1.5 uppercase tracking-wider shadow-sm">
                {course.category}
              </div>
              <h2 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-white leading-tight drop-shadow">{course.title}</h2>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-grow overflow-y-auto p-4 sm:p-6 md:p-8 scrollbar-none space-y-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
              
              {/* Main Content (Left) */}
              <div className="w-full lg:w-2/3 space-y-5">
                <section>
                  <h3 className="text-base sm:text-lg font-bold text-text-heading mb-1.5 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-amber-500" />
                    About this Program
                  </h3>
                  <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">{course.description}</p>
                </section>

                <section>
                  <h3 className="text-base sm:text-lg font-bold text-text-heading mb-2.5 flex items-center gap-2">
                    <BookOpen size={17} className="text-primary" />
                    Full Syllabus &amp; Curriculum
                  </h3>
                  <div className="space-y-2.5">
                    {syllabusList.map((module, index) => (
                      <div key={index} className="border border-gray-200/80 rounded-2xl overflow-hidden shadow-xs">
                        <button 
                          className="w-full bg-slate-50/80 px-3.5 py-3 flex items-center justify-between font-bold text-text-heading hover:bg-slate-100 transition-colors text-xs sm:text-sm cursor-pointer"
                          onClick={() => setOpenAccordion(openAccordion === index ? null : index)}
                        >
                          <span className="text-left">{module.title}</span>
                          <ChevronDown size={16} className={`transform transition-transform shrink-0 ${openAccordion === index ? 'rotate-180 text-primary' : 'text-slate-400'}`} />
                        </button>
                        <AnimatePresence>
                          {openAccordion === index && (
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <ul className="px-3.5 py-2.5 space-y-1.5 bg-white text-xs text-slate-600 border-t border-gray-100">
                                {module.topics.map((topic, tIdx) => (
                                  <li key={tIdx} className="flex items-start gap-2">
                                    <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                                    <span>{topic}</span>
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </section>

                {course.galleryUrls && course.galleryUrls.length > 0 && (
                  <section>
                    <h3 className="text-base sm:text-lg font-bold text-text-heading mb-2.5">Classroom &amp; Labs</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {course.galleryUrls.map((url, i) => (
                        <img key={i} src={url} alt={`Gallery ${i}`} className="w-full h-24 sm:h-32 object-cover rounded-2xl border border-slate-100 shadow-sm" />
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Sidebar Info (Right) */}
              <div className="w-full lg:w-1/3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3.5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
                      <p className="font-extrabold text-text-heading text-xs sm:text-sm">{course.duration}</p>
                    </div>
                  </div>

                  {(course.originalPrice || course.discountedPrice) && (
                    <div className="bg-white rounded-xl p-3 border border-indigo-100 shadow-xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Course Fee</p>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        {course.discountedPrice && (
                          <span className="text-xl sm:text-2xl font-extrabold text-indigo-600">
                            ₹{course.discountedPrice}<span className="text-[10px] text-slate-500 font-medium">/mo</span>
                          </span>
                        )}
                        {course.originalPrice && (
                          <span className="text-xs font-medium text-slate-400 line-through">
                            ₹{course.originalPrice}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
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
                onEnquire({ id: course.id, title: course.title });
              }}
              className="flex-1 sm:flex-initial bg-primary hover:bg-indigo-600 text-white px-6 py-2.5 sm:py-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-glow-primary flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>Enquire for Course</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
