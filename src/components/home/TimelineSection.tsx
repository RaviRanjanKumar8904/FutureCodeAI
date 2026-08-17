import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Reveal from '../Reveal';

const steps = [
  {
    num: "01",
    title: "Choose Domain",
    desc: "Select your desired tech domain based on your career goals and skill level."
  },
  {
    num: "02",
    title: "Join Local Cohort",
    desc: "Enroll at a recognized partner training institute or center near you."
  },
  {
    num: "03",
    title: "Learn Hands-On",
    desc: "Build real-world production projects with expert mentorship and code reviews."
  },
  {
    num: "04",
    title: "Get Certified",
    desc: "Earn your verified credential and unlock high-impact internship opportunities."
  }
];

export default function TimelineSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const lineWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section className="py-16 sm:py-24 bg-surface relative z-10 overflow-hidden" ref={containerRef}>
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <Reveal direction="up">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-20">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
              Step-By-Step Path
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-text-heading mb-3 sm:mb-4 tracking-tight">
              How It Works
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium max-w-xl mx-auto">
              A seamless roadmap from enrollment to industry readiness, right in your city.
            </p>
          </div>
        </Reveal>

        <div className="relative">
          {/* Connecting Line - Mobile (Vertical) */}
          <div className="absolute left-[27px] sm:left-[31px] top-4 bottom-4 w-1 bg-gray-200 md:hidden rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className="absolute top-0 left-0 right-0 bg-gradient-to-b from-primary via-indigo-500 to-secondary"
              style={{ height: lineHeight }}
            />
          </div>

          {/* Connecting Line - Desktop (Horizontal) */}
          <div className="absolute top-[39px] left-0 right-0 h-1 bg-gray-200 hidden md:block rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-primary via-indigo-500 to-secondary shadow-[0_0_10px_rgba(79,70,229,0.5)]"
              style={{ width: lineWidth }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-10 md:gap-6">
            {steps.map((step, index) => (
              <div key={index} className="relative flex md:flex-col items-start md:items-center gap-4 sm:gap-6 md:gap-8 group">
                {/* Number Circle */}
                <Reveal delay={index * 0.15} className="relative z-10 shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border-2 border-indigo-100 shadow-md flex items-center justify-center font-extrabold text-xl sm:text-2xl text-primary font-heading group-hover:scale-105 group-hover:shadow-glow-primary transition-all duration-300">
                    {step.num}
                  </div>
                </Reveal>

                {/* Content */}
                <Reveal delay={index * 0.15 + 0.05} direction="up" className="md:text-center mt-1 md:mt-0 flex-1">
                  <h3 className="text-base sm:text-xl font-extrabold text-text-heading mb-1.5 sm:mb-2 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium">
                    {step.desc}
                  </p>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
