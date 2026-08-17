import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, ChevronDown, CheckCircle2, BookOpen } from 'lucide-react';
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
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col z-10 border border-slate-100"
        >
          {/* Header Image */}
          <div className="relative h-44 sm:h-52 md:h-60 shrink-0">
            <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-slate-950/30 hover:bg-white text-white hover:text-slate-950 backdrop-blur-md p-2 rounded-full transition-colors cursor-pointer z-20 shadow-md"
            >
              <X size={20} />
            </button>
            <div className="absolute bottom-4 left-4 sm:left-6 right-4">
              <div className="inline-block bg-primary text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wider">
                {course.category}
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight">{course.title}</h2>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-grow overflow-y-auto p-4 sm:p-6 md:p-8 scrollbar-hide">
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
              
              {/* Main Content (Left) */}
              <div className="w-full lg:w-2/3 space-y-6">
                <section>
                  <h3 className="text-lg sm:text-xl font-bold text-text-heading mb-2">About this Course</h3>
                  <p className="text-slate-600 leading-relaxed text-sm sm:text-base">{course.description}</p>
                </section>

                <section>
                  <h3 className="text-lg sm:text-xl font-bold text-text-heading mb-3 flex items-center gap-2">
                    <BookOpen size={20} className="text-primary" />
                    Full Syllabus &amp; Curriculum
                  </h3>
                  <div className="space-y-3">
                    {syllabusList.map((module, index) => (
                      <div key={index} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <button 
                          className="w-full bg-slate-50 px-4 py-3.5 flex items-center justify-between font-bold text-text-heading hover:bg-slate-100 transition-colors text-sm sm:text-base"
                          onClick={() => setOpenAccordion(openAccordion === index ? null : index)}
                        >
                          <span className="text-left">{module.title}</span>
                          <ChevronDown size={18} className={`transform transition-transform ${openAccordion === index ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {openAccordion === index && (
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <ul className="px-4 py-3 space-y-2 bg-white text-xs sm:text-sm">
                                {module.topics.map((topic, tIdx) => (
                                  <li key={tIdx} className="flex items-start gap-2 text-slate-600">
                                    <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
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
                    <h3 className="text-lg sm:text-xl font-bold text-text-heading mb-3">Batch Gallery</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {course.galleryUrls.map((url, i) => (
                        <img key={i} src={url} alt={`Gallery ${i}`} className="w-full h-28 sm:h-32 object-cover rounded-xl border border-slate-100 shadow-sm" />
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Sidebar (Right) */}
              <div className="w-full lg:w-1/3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-6 lg:sticky lg:top-4 space-y-4 shadow-sm">
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Clock className="text-primary mt-1 shrink-0" size={18} />
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Duration</p>
                        <p className="font-bold text-text-heading text-sm sm:text-base">{course.duration}</p>
                      </div>
                    </div>
                  </div>

                  {(course.originalPrice || course.discountedPrice) && (
                    <div className="bg-white rounded-xl p-3.5 border border-indigo-100 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Course Fee</p>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        {course.discountedPrice && (
                          <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
                            ₹{course.discountedPrice}<span className="text-xs text-slate-500 font-medium">/mo</span>
                          </span>
                        )}
                        {course.originalPrice && (
                          <span className="text-sm font-medium text-slate-400 line-through">
                            ₹{course.originalPrice}/mo
                          </span>
                        )}
                        {course.originalPrice && course.discountedPrice && (
                          <span className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md">
                            {Math.round(((course.originalPrice - course.discountedPrice) / course.originalPrice) * 100)}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button 
                      onClick={() => {
                        onClose();
                        onEnquire({ id: course.id, title: course.title });
                      }}
                      className="w-full bg-primary hover:bg-indigo-600 text-white py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base transition-colors shadow-glow-primary cursor-pointer active:scale-95"
                    >
                      Enquire Now
                    </button>
                  </div>
                  
                </div>
              </div>
              
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
