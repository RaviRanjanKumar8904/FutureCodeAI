import { Canvas } from '@react-three/fiber';
import { Float, PresentationControls, Octahedron, Edges } from '@react-three/drei';
import { Search, ShieldCheck } from 'lucide-react';
import Reveal from '../Reveal';

function TrustShield() {
  return (
    <Float speed={2.5} rotationIntensity={0.5} floatIntensity={1}>
      <PresentationControls
        global={false}
        cursor={true}
        snap={true}
        speed={1.5}
        zoom={1}
        polar={[-0.1, 0.1]}
        azimuth={[-Math.PI / 8, Math.PI / 8]}
      >
        <Octahedron args={[1.7, 0]} rotation={[0, 0, 0]}>
          <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.2} wireframe={true} />
          <Edges scale={1.05} threshold={15} color="#fbbf24" />
        </Octahedron>
        <Octahedron args={[1.1, 0]}>
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
        </Octahedron>
      </PresentationControls>
    </Float>
  );
}

interface VerifyHeroProps {
  certificateId: string;
  setCertificateId: (val: string) => void;
  onVerify: () => void;
  isLoading: boolean;
}

export default function VerifyHero({ certificateId, setCertificateId, onVerify, isLoading }: VerifyHeroProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (certificateId.trim()) {
      onVerify();
    }
  };

  return (
    <section className="relative pt-24 sm:pt-32 pb-8 sm:pb-12 overflow-hidden flex flex-col items-center">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl relative z-10">
        
        <Reveal direction="up" className="w-full">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 md:p-12 shadow-2xl border border-slate-200/80 relative overflow-hidden text-center">
            
            {/* 3D Shield Badge - Responsively sized */}
            <div className="h-32 sm:h-44 md:h-52 w-full relative -mt-2 mb-4">
              <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <ambientLight intensity={1.8} />
                <directionalLight position={[10, 10, 5]} intensity={2.5} />
                <TrustShield />
              </Canvas>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-extrabold border border-amber-200/80 mb-3">
              <ShieldCheck size={14} className="text-amber-600" />
              <span>Official Verification Portal</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">
              Verify Certificate
            </h1>
            <p className="text-xs sm:text-base text-slate-500 font-medium mb-8 max-w-lg mx-auto">
              Enter the unique Certificate ID to verify authentic student credentials, course completion, and performance records.
            </p>

            <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto">
              <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
                <div className="relative w-full">
                  <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text"
                    value={certificateId}
                    onChange={(e) => setCertificateId(e.target.value)}
                    placeholder="e.g. FC-2026-DEMO"
                    className="w-full bg-slate-50/80 border-2 border-slate-200 text-slate-900 text-sm sm:text-base font-bold rounded-2xl sm:rounded-full py-3.5 sm:py-4 pl-12 sm:pl-14 pr-4 outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner uppercase tracking-wider"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isLoading || !certificateId.trim()}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-8 py-3.5 sm:py-4 rounded-2xl sm:rounded-full font-extrabold text-sm sm:text-base transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center sm:min-w-[130px] cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </button>
              </div>
            </form>

          </div>
        </Reveal>

      </div>
    </section>
  );
}
