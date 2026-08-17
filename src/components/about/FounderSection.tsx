import Reveal from '../Reveal';
import { Quote } from 'lucide-react';

export default function FounderSection({ founder }: { founder: any }) {
  return (
    <section className="py-16 sm:py-24 bg-surface relative z-10 border-y border-gray-100 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-8 sm:gap-12 lg:gap-16 items-center">
          
          <div className="w-full max-w-[240px] sm:max-w-xs lg:w-1/3 mx-auto">
            <Reveal direction="right">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary to-secondary rounded-3xl transform -rotate-3 scale-105 opacity-20 blur-xl" />
                <img 
                  src={founder.photoUrl || '/logo.jpg'} 
                  alt={founder.name}
                  className="w-full aspect-square object-cover rounded-3xl shadow-xl relative z-10 border-4 border-white bg-white p-2"
                />
              </div>
            </Reveal>
          </div>

          <div className="w-full lg:w-2/3 text-center lg:text-left">
            <Reveal direction="left" delay={0.15}>
              <span className="text-xs font-bold uppercase tracking-widest text-primary mb-1 block">
                Leadership
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-text-heading tracking-tight mb-1">
                {founder.name}
              </h2>
              <p className="text-primary font-bold text-xs sm:text-sm mb-4 sm:mb-6 uppercase tracking-wider">
                {founder.title}
              </p>
              
              <div className="text-xs sm:text-base text-slate-600 font-medium leading-relaxed mb-6 sm:mb-8">
                <p>{founder.bio}</p>
              </div>

              {founder.quote && (
                <div className="relative max-w-xl mx-auto lg:mx-0">
                  <Quote className="absolute top-0 left-0 text-primary/10 transform -translate-x-3 -translate-y-3" size={48} />
                  <blockquote className="relative z-10 border-l-4 border-primary pl-4 sm:pl-6 py-1 text-left">
                    <p className="text-base sm:text-xl md:text-2xl font-heading font-bold text-text-heading italic leading-snug">
                      "{founder.quote}"
                    </p>
                  </blockquote>
                </div>
              )}
            </Reveal>
          </div>
          
        </div>
      </div>
    </section>
  );
}
