import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Bot, Code2, Globe, Cpu, Braces, GraduationCap, ArrowRight } from 'lucide-react';
import Reveal from '../Reveal';
import { Link } from 'react-router-dom';

const offerings = [
  {
    title: 'AI & Machine Learning',
    description: 'Master neural networks, deep learning, NLP, and practical AI applications.',
    icon: <Bot size={28} />,
    color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    link: '/programs'
  },
  {
    title: 'Prompt Engineering',
    description: 'Learn to communicate with LLMs effectively for automation, coding, and production generation.',
    icon: <Code2 size={28} />,
    color: 'bg-gradient-to-br from-indigo-500 to-purple-600',
    link: '/programs'
  },
  {
    title: 'Web Development',
    description: 'Build responsive, modern websites using HTML, CSS, JavaScript, and Tailwind CSS.',
    icon: <Globe size={28} />,
    color: 'bg-gradient-to-br from-cyan-500 to-blue-600',
    link: '/programs'
  },
  {
    title: 'Full-Stack Engineering',
    description: 'End-to-end applications with React, Node.js, Express, databases, and cloud deployment.',
    icon: <Braces size={28} />,
    color: 'bg-gradient-to-br from-teal-500 to-emerald-600',
    link: '/programs'
  },
  {
    title: 'Core Programming & DSA',
    description: 'Master C, C++, Java, and Python fundamentals, problem-solving, and algorithmic complexity.',
    icon: <Cpu size={28} />,
    color: 'bg-gradient-to-br from-purple-500 to-pink-600',
    link: '/programs'
  },
  {
    title: 'Industry Internship Program',
    description: 'Gain real-world industry experience building production-ready projects with mentor feedback.',
    icon: <GraduationCap size={28} />,
    color: 'bg-gradient-to-br from-amber-500 to-orange-600',
    link: '/internships'
  }
];

function TiltCard({ offering }: { offering: typeof offerings[0] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 260, damping: 24, mass: 0.5 });
  const mouseYSpring = useSpring(y, { stiffness: 260, damping: 24, mass: 0.5 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className="relative h-full"
    >
      <div 
        className="glass h-full p-6 sm:p-7 md:p-8 rounded-3xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden border border-white/80 shadow-sm hover:shadow-xl"
        style={{
          boxShadow: isHovered 
            ? '0 30px 60px -12px rgba(79, 70, 229, 0.2), inset 0 0 0 1px rgba(255,255,255,0.6)' 
            : '0 10px 30px -10px rgba(0, 0, 0, 0.04), inset 0 0 0 1px rgba(255,255,255,0.4)'
        }}
      >
        <div>
          <div 
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white mb-4 sm:mb-6 shadow-md transition-transform duration-300 ${offering.color} ${isHovered ? 'scale-110' : ''}`}
          >
            {offering.icon}
          </div>
          
          <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-text-heading mb-2 tracking-tight group-hover:text-primary transition-colors leading-snug">
            {offering.title}
          </h3>
          
          <p className="text-xs sm:text-sm text-slate-600 font-medium mb-6 leading-relaxed">
            {offering.description}
          </p>
        </div>
        
        <Link 
          to={offering.link}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-primary font-bold hover:gap-2.5 transition-all pt-2 border-t border-gray-100"
        >
          <span>Explore Program</span>
          <ArrowRight size={15} />
        </Link>
      </div>
    </motion.div>
  );
}

export default function OfferingsSection() {
  return (
    <section className="py-16 sm:py-24 relative z-10" id="offerings">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <Reveal direction="up">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
              Curated Curriculum
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-text-heading mb-3 sm:mb-4 tracking-tight">
              What We Offer
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium max-w-xl mx-auto">
              Cutting-edge technology domains taught through an immersive, project-based curriculum. 
              Find the path that fits your career goals.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {offerings.map((offering, index) => (
            <Reveal key={index} delay={index * 0.08} direction="up" className="h-full">
              <TiltCard offering={offering} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
