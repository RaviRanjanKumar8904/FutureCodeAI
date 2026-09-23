import Reveal from '../Reveal';

export default function TrustBar() {
  return (
    <section className="py-16 bg-white relative z-10 border-b border-gray-100">
      <div className="container mx-auto px-6 max-w-7xl">
        <Reveal direction="up">
          <p className="text-center text-sm md:text-base font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-10">
            Authorised By
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
            
            {/* Startup Bihar Card */}
            <div className="glass px-6 sm:px-8 py-5 sm:py-6 rounded-2xl flex items-center gap-5 sm:gap-6 group hover:-translate-y-2 transition-transform duration-300 shadow-soft hover:shadow-soft-lg w-full md:w-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-white rounded-xl shadow-sm p-2 shrink-0 border border-gray-50">
                <img src="/auth-1.webp" alt="Startup Bihar" width={80} height={80} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="text-left">
                <h4 className="font-extrabold text-text-heading text-lg sm:text-xl tracking-tight">Startup Bihar</h4>
                <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">SB2026070671</p>
              </div>
            </div>

            {/* MSME Card */}
            <div className="glass px-6 sm:px-8 py-5 sm:py-6 rounded-2xl flex items-center gap-5 sm:gap-6 group hover:-translate-y-2 transition-transform duration-300 shadow-soft hover:shadow-soft-lg w-full md:w-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-white rounded-xl shadow-sm p-2 shrink-0 border border-gray-50">
                <img src="/auth-2.webp" alt="MSME" width={80} height={80} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="text-left">
                <h4 className="font-extrabold text-text-heading text-lg sm:text-xl tracking-tight">MSME</h4>
                <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">UDYAM-BR-27-0088148</p>
              </div>
            </div>

          </div>
        </Reveal>
      </div>
    </section>
  );
}
