import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, ChevronDown, CheckCircle2 } from 'lucide-react';
import type { CourseData } from './CourseCard';

interface CourseModalProps {
  course: CourseData | null;
  onClose: () => void;
  onEnquire: (target: { id: string, title: string }) => void;
}

export default function CourseModal({ course, onClose, onEnquire }: CourseModalProps) {
  const [openAccordion, setOpenAccordion] = useState<number | null>(0);

  return (
    <AnimatePresence>
      {course && (
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
          {/* Header Image */}
          <div className="relative h-44 sm:h-48 md:h-60 shrink-0">
            <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-slate-950/20 hover:bg-white text-white hover:text-slate-950 backdrop-blur-md p-2 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="absolute bottom-4 left-4 sm:left-6 right-4">
              <div className="inline-block bg-primary text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-[0.24em]">
                {course.category}
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">{course.title}</h2>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-grow overflow-y-auto p-4 sm:p-6 md:p-8 scrollbar-hide">
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
              
              {/* Main Content (Left) */}
              <div className="w-full lg:w-2/3 space-y-6">
                <section>
                  <h3 className="text-2xl font-bold text-text-heading mb-4">About this Course</h3>
                  <p className="text-slate-600 leading-relaxed text-lg">{course.description}</p>
                </section>

                <section>
                  <h3 className="text-2xl font-bold text-text-heading mb-4">Curriculum</h3>
                  <div className="space-y-3">
                    {course.syllabus.map((module, index) => (
                      <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                        <button 
                          className="w-full bg-slate-50 px-5 py-4 flex items-center justify-between font-bold text-text-heading hover:bg-slate-100 transition-colors"
                          onClick={() => setOpenAccordion(openAccordion === index ? null : index)}
                        >
                          <span className="text-left">{module.title}</span>
                          <ChevronDown size={20} className={`transform transition-transform ${openAccordion === index ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {openAccordion === index && (
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <ul className="px-5 py-4 space-y-2 bg-white">
                                {module.topics.map((topic, tIdx) => (
                                  <li key={tIdx} className="flex items-start gap-2 text-slate-600">
                                    <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
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
                    <h3 className="text-2xl font-bold text-text-heading mb-4">Batch Gallery</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {course.galleryUrls.map((url, i) => (
                        <img key={i} src={url} alt={`Gallery ${i}`} className="w-full h-32 object-cover rounded-xl" />
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Sidebar (Right) */}
              <div className="w-full lg:w-1/3">
                <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 sm:p-6 lg:p-6 lg:sticky lg:top-6 space-y-5 shadow-soft-lg">
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Clock className="text-primary mt-1" size={20} />
                      <div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Duration</p>
                        <p className="font-bold text-text-heading">{course.duration}</p>
                      </div>
                    </div>
                  </div>

                  {(course.originalPrice || course.discountedPrice) && (
                    <div className="bg-white rounded-xl p-4 border border-indigo-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Course Fee</p>
                      <div className="flex items-baseline gap-3">
                        {course.discountedPrice && (
                          <span className="text-3xl font-extrabold text-indigo-600">
                            ₹{course.discountedPrice}<span className="text-sm text-slate-500 font-medium">/mo</span>
                          </span>
                        )}
                        {course.originalPrice && (
                          <span className="text-lg font-medium text-slate-400 line-through">
                            ₹{course.originalPrice}/mo
                          </span>
                        )}
                        {course.originalPrice && course.discountedPrice && (
                          <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 px-2 py-1 rounded-md ml-auto">
                            {Math.round(((course.originalPrice - course.discountedPrice) / course.originalPrice) * 100)}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-6 border-t border-gray-200">
                    <button 
                      onClick={() => {
                        onClose();
                        onEnquire({ id: course.id, title: course.title });
                      }}
                      className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-600 transition-colors shadow-glow-primary"
                    >
                      Enquire Now
                    </button>
                    {/* TODO: Add payment integration here in future phase */}
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
