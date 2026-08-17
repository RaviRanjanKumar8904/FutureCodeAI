import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Bot, Code2, Globe, Cpu, Braces, GraduationCap } from 'lucide-react';
import Reveal from '../Reveal';
import { Link } from 'react-router-dom';

const offerings = [
  {
    title: 'AI & Machine Learning',
    description: 'Master neural networks, deep learning, and practical AI applications.',
    icon: <Bot size={32} />,
    color: 'bg-blue-500',
    link: '/courses/ai-ml'
  },
  {
    title: 'Prompt Engineering',
    description: 'Learn to communicate with LLMs effectively for automation and generation.',
    icon: <Code2 size={32} />,
    color: 'bg-indigo-500',
    link: '/courses/prompt-engineering'
  },
  {
    title: 'Web Development',
    description: 'Build responsive, modern websites using HTML, CSS, and modern frameworks.',
    icon: <Globe size={32} />,
    color: 'bg-cyan-500',
    link: '/courses/web-dev'
  },
  {
    title: 'Full-Stack Dev',
    description: 'End-to-end applications with React, Node.js, databases, and deployment.',
    icon: <Braces size={32} />,
    color: 'bg-teal-500',
    link: '/courses/full-stack'
  },
  {
    title: 'Core Programming',
    description: 'Master C, C++, Java, and Python to build strong fundamentals.',
    icon: <Cpu size={32} />,
    color: 'bg-purple-500',
    link: '/courses/core'
  },
  {
    title: 'Internship Program',
    description: 'Gain real-world experience building production-ready projects.',
    icon: <GraduationCap size={32} />,
    color: 'bg-accent',
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

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["9deg", "-9deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-9deg", "9deg"]);

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
        className="glass h-full p-5 md:p-8 rounded-2xl md:rounded-3xl transition-all duration-300 flex flex-col group relative overflow-hidden"
        style={{
          boxShadow: isHovered 
            ? '0 30px 60px -12px rgba(79, 70, 229, 0.25), inset 0 0 0 1px rgba(255,255,255,0.5)' 
            : '0 10px 30px -10px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255,255,255,0.2)'
        }}
      >
        {/* Subtle hover gradient background */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
        />
        <div 
          className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-white mb-4 md:mb-6 shadow-md transition-transform duration-300 ${offering.color} ${isHovered ? 'scale-110' : ''}`}
          style={{ transform: isHovered ? 'translateZ(50px)' : 'translateZ(0)' }}
        >
          {offering.icon}
        </div>
        
        <h3 
          className="text-lg md:text-2xl font-extrabold text-text-heading mb-2 md:mb-3 tracking-tight group-hover:text-primary transition-colors"
          style={{ transform: isHovered ? 'translateZ(30px)' : 'translateZ(0)' }}
        >
          {offering.title}
        </h3>
        
        <p 
          className="text-sm md:text-base text-slate-500 font-medium mb-4 md:mb-8 flex-grow leading-relaxed"
          style={{ transform: isHovered ? 'translateZ(20px)' : 'translateZ(0)' }}
        >
          {offering.description}
        </p>
        
        <Link 
          to={offering.link}
          className="text-sm md:text-base text-primary font-semibold flex items-center gap-1 md:gap-2 group-hover:gap-2 md:group-hover:gap-3 transition-all"
          style={{ transform: isHovered ? 'translateZ(40px)' : 'translateZ(0)' }}
        >
          Explore Course <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </motion.div>
  );
}

export default function OfferingsSection() {
  return (
    <section className="py-24 relative z-10" id="offerings">
      <div className="container mx-auto px-6 max-w-7xl">
        <Reveal direction="up">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-text-heading mb-6">What We Offer</h2>
            <p className="text-lg text-text-body">
              Cutting-edge domains taught through an immersive, project-based curriculum. 
              Find the path that fits your career goals.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 perspective-1000">
          {offerings.map((offering, index) => (
            <Reveal key={index} delay={index * 0.1} direction="up" className="h-full">
              <TiltCard offering={offering} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
