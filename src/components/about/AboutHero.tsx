import { Suspense, lazy } from 'react';
import Reveal from '../Reveal';
import { Cpu } from 'lucide-react';

const AboutHeroCanvas = lazy(() => import('./AboutHeroCanvas'));

function AboutVisualFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-gradient-to-tr from-indigo-500/20 to-cyan-400/20 blur-2xl animate-pulse" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="p-6 rounded-3xl bg-white/70 backdrop-blur-md border border-white/60 shadow-xl text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-primary flex items-center justify-center mx-auto mb-2">
            <Cpu size={24} />
          </div>
          <span className="text-xs font-bold text-slate-700">FutureCode Education</span>
        </div>
      </div>
    </div>
  );
}

export default function AboutHero() {
  return (
    <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 overflow-hidden min-h-[60vh] sm:min-h-[70vh] flex items-center">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12">
          
          <div className="w-full lg:w-1/2 space-y-4 sm:space-y-6 text-center lg:text-left">
            <Reveal direction="up">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white shadow-sm text-xs sm:text-sm font-bold text-primary">
                Who We Are
              </div>
            </Reveal>
            
            <Reveal direction="up" delay={0.1}>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.15] sm:leading-[1.1] text-text-heading tracking-tight">
                Bridging the Gap Between <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-600 to-secondary drop-shadow-sm">
                  Classrooms &amp; Careers
                </span>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <p className="text-xs sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
                We empower traditional educational institutes with the modern technology curriculum and industry connections needed to build the developers of tomorrow.
              </p>
            </Reveal>
          </div>

          <div className="w-full lg:w-1/2 h-[28vh] sm:h-[40vh] lg:h-[60vh] relative">
            <Reveal direction="left" delay={0.25} className="w-full h-full flex items-center justify-center">
              <div className="hidden md:block w-full h-full">
                <Suspense fallback={<AboutVisualFallback />}>
                  <AboutHeroCanvas />
                </Suspense>
              </div>
              <div className="md:hidden w-full h-full flex items-center justify-center">
                <AboutVisualFallback />
              </div>
            </Reveal>
          </div>

        </div>
      </div>
    </section>
  );
}
