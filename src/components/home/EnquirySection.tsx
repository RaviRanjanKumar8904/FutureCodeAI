import { MessageSquare, ArrowUpRight, PhoneCall } from 'lucide-react';
import Reveal from '../Reveal';

export default function EnquirySection() {
  return (
    <section className="py-16 sm:py-24 bg-surface relative z-10 overflow-hidden" id="enquiry-form">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <Reveal direction="up">
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 md:p-14 text-center text-white relative shadow-2xl overflow-hidden border border-indigo-500/20">
            {/* Background glowing orbs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <MessageSquare size={14} />
                <span>Instant Admissions &amp; Guidance</span>
              </div>

              <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Ready to Start Your Journey?
              </h2>

              <p className="text-xs sm:text-base text-slate-300 font-medium leading-relaxed max-w-lg mx-auto">
                Fill out our quick registration form or connect with our academic counselors for course recommendations and center availability.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
                <a 
                  href="https://docs.google.com/forms/d/e/1FAIpQLSft3jx8ku_rz3flPi655bQgpEB_i40yS04vIVhDNV9Fb-OzPA/viewform?usp=sharing&ouid=108683978754416404738"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto bg-gradient-to-r from-primary via-indigo-600 to-primary text-white px-8 py-3.5 sm:py-4 rounded-2xl sm:rounded-full text-sm sm:text-base font-extrabold hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  <span>Open Registration Form</span>
                  <ArrowUpRight size={18} />
                </a>

                <a 
                  href="tel:+918709078136"
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/15 backdrop-blur-md text-white border border-white/20 px-6 py-3.5 sm:py-4 rounded-2xl sm:rounded-full text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <PhoneCall size={17} className="text-emerald-400" />
                  <span>Call: +91 8709078136</span>
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
