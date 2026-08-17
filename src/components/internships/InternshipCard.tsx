import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Clock, Code2 } from 'lucide-react';
import Reveal from '../Reveal';

export interface InternshipData {
  id: string;
  title: string;
  domain: string;
  description: string;
  duration: string;
  eligibility: string;
  stipend: string;
  skills: string[];
  deadline: string;
  thumbnailUrl?: string;
  isActive: boolean;
}

interface InternshipCardProps {
  internship: InternshipData;
  index: number;
  onClick: () => void;
}

export default function InternshipCard({ internship, index, onClick }: InternshipCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 280, damping: 25, mass: 0.5 };
  const mouseXSpring = useSpring(x, springConfig);
  const mouseYSpring = useSpring(y, springConfig);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["9deg", "-9deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-9deg", "9deg"]);

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
        onClick={onClick}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="glass rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer h-full flex flex-col group border border-white/60 hover:shadow-premium-card relative transform-gpu will-change-transform"
      >
        <div className="relative h-44 sm:h-52 overflow-hidden bg-slate-100">
          <img
            src={internship.thumbnailUrl || 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=800'}
            alt={internship.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
        </div>

        {/* Dynamic Glare Overlay */}
        <div 
          className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/30 via-transparent to-transparent"
        />

        <div className="relative z-10 flex flex-col h-full p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Code2 size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="bg-slate-100 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider self-start">
              {internship.domain}
            </div>
          </div>

          <h3 className="text-sm sm:text-2xl font-extrabold text-text-heading mb-2 sm:mb-3 leading-tight">{internship.title}</h3>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6 flex-grow line-clamp-3 sm:line-clamp-none">{internship.description}</p>
          
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 font-medium py-3 sm:py-4 border-t border-gray-100">
            <Clock size={14} className="text-primary sm:w-4 sm:h-4" /> {internship.duration}
          </div>

          <button className="mt-1 sm:mt-2 w-full py-2 sm:py-3 rounded-lg sm:rounded-xl bg-slate-100 text-primary text-xs sm:text-base font-bold group-hover:bg-primary group-hover:text-white group-hover:shadow-glow-primary transition-all duration-300">
            View Details
          </button>
        </div>
      </motion.div>
    </Reveal>
  );
}
