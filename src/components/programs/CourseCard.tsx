import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Clock } from 'lucide-react';
import Reveal from '../Reveal';

export interface CourseData {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  level: string;
  institute: {
    name: string;
    city: string;
    address: string;
  };
  thumbnailUrl: string;
  galleryUrls: string[];
  syllabus: { title: string; topics: string[] }[];
  batchTimings: string;
  isActive: boolean;
  totalSeats?: number;
  filledSeats?: number;
  originalPrice?: number;
  discountedPrice?: number;
  isTopSelling?: boolean;
}

interface CourseCardProps {
  course: CourseData;
  index: number;
  onEnquire: (target: { id: string; title: string }) => void;
}

export default function CourseCard({ course, index, onEnquire }: CourseCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 280, damping: 25, mass: 0.5 };
  const mouseXSpring = useSpring(x, springConfig);
  const mouseYSpring = useSpring(y, springConfig);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <Reveal direction="up" delay={index * 0.08}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="glass rounded-3xl overflow-hidden h-full flex flex-col group border border-white/60 hover:shadow-[0_20px_40px_rgba(79,70,229,0.15)] relative transform-gpu will-change-transform"
      >
        {/* Dynamic Glare Overlay */}
        <div 
          className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/30 via-transparent to-transparent"
        />

        <div className="h-32 sm:h-48 overflow-hidden relative">
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 flex flex-col gap-2">
            <div className="bg-white/90 backdrop-blur-md px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-primary shadow-sm uppercase tracking-wider w-max">
              {course.category}
            </div>
            {course.isTopSelling && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-sm flex items-center gap-1 w-max shadow-orange-500/30">
                <span>🔥</span> Top Selling
              </div>
            )}
          </div>
          <img 
            src={course.thumbnailUrl} 
            alt={course.title}
            loading="lazy"
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
          />
        </div>

        <div className="p-3 sm:p-6 flex flex-col flex-grow relative z-10 bg-white/40">
          <h3 className="text-sm sm:text-xl font-extrabold text-text-heading mb-1 sm:mb-2 line-clamp-2 leading-tight">{course.title}</h3>
          <p className="text-slate-500 text-[10px] sm:text-sm mb-2 sm:mb-4 line-clamp-2 leading-relaxed">{course.description}</p>
          
          <div className="space-y-1 sm:space-y-2 mt-auto pt-2 sm:pt-4 border-t border-gray-200">
            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-slate-600 font-medium">
              <Clock size={12} className="text-primary sm:w-4 sm:h-4" /> {course.duration}
            </div>
            {(course.originalPrice || course.discountedPrice) && (
              <div className="flex items-center gap-2 mt-1">
                {course.discountedPrice && (
                  <span className="text-sm sm:text-lg font-extrabold text-emerald-600">
                    ₹{course.discountedPrice}/mo
                  </span>
                )}
                {course.originalPrice && (
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium line-through">
                    ₹{course.originalPrice}/mo
                  </span>
                )}
                {course.originalPrice && course.discountedPrice && (
                  <span className="text-[10px] sm:text-xs font-bold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md ml-auto sm:ml-0">
                    {Math.round(((course.originalPrice - course.discountedPrice) / course.originalPrice) * 100)}% OFF
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnquire({ id: course.id, title: course.title });
            }}
            className="mt-3 sm:mt-6 w-full py-2 sm:py-3 rounded-lg sm:rounded-xl bg-primary text-white text-xs sm:text-base font-bold hover:bg-indigo-600 transition-all duration-300"
          >
            Enquire Now
          </button>
        </div>
      </motion.div>
    </Reveal>
  );
}
