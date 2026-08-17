import { Suspense, useRef, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PresentationControls, Icosahedron, TorusKnot, Float } from '@react-three/drei';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Code2, Cpu, ShieldCheck } from 'lucide-react';
import Reveal from '../Reveal';
import * as THREE from 'three';

// Local Error Boundary for 3D Canvas
interface CanvasErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  public state: CanvasErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(_: Error): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('3D Canvas fallback activated:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// 3D Shapes with pure local lighting (No remote HDR assets needed)
function AbstractShapes() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.12;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.8} rotationIntensity={1.2} floatIntensity={1.8}>
        <Icosahedron args={[1.1, 0]} position={[-1.4, 0.4, 0]}>
          <meshPhysicalMaterial 
            color="#4F46E5" 
            roughness={0.15} 
            metalness={0.85} 
            clearcoat={1} 
            clearcoatRoughness={0.1}
          />
        </Icosahedron>
      </Float>
      
      <Float speed={2.2} rotationIntensity={1.4} floatIntensity={1.6}>
        <TorusKnot args={[0.65, 0.22, 128, 32]} position={[1.4, -0.4, -0.8]}>
          <meshPhysicalMaterial 
            color="#06B6D4" 
            roughness={0.2} 
            metalness={0.9} 
            clearcoat={0.8}
          />
        </TorusKnot>
      </Float>
    </group>
  );
}

// High-Performance Glass Morphism CSS Fallback
function HeroVisualFallback() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-gradient-to-tr from-primary/30 to-cyan-400/30 blur-2xl animate-pulse" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl space-y-3 max-w-xs text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-cyan-500 text-white flex items-center justify-center mx-auto shadow-md">
            <Cpu size={28} />
          </div>
          <h3 className="font-extrabold text-slate-900 text-base">FutureCode AI Studio</h3>
          <p className="text-xs text-slate-500 font-medium">Empowering Next-Gen Engineers with AI &amp; Full-Stack</p>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 800], [0, 60]);
  const opacity = useTransform(scrollY, [0, 600], [1, 0.3]);

  return (
    <section className="relative min-h-[90vh] sm:min-h-screen flex items-center pt-24 sm:pt-32 pb-12 sm:pb-20 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
        
        {/* Text Content */}
        <motion.div 
          style={{ y: y1, opacity }} 
          className="space-y-6 sm:space-y-8 text-center lg:text-left"
        >
          <Reveal direction="up" delay={0.05}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/80 shadow-sm text-xs sm:text-sm font-bold text-primary">
              <Sparkles size={14} className="text-amber-500 animate-pulse" />
              <span>Next-Gen Tech Education Platform</span>
            </div>
          </Reveal>
          
          <Reveal direction="up" delay={0.12}>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.15] sm:leading-[1.1] text-text-heading tracking-tight">
              Learn the Technology That <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-600 to-secondary drop-shadow-sm">
                Builds Tomorrow
              </span>
            </h1>
          </Reveal>

          <Reveal direction="up" delay={0.18}>
            <p className="text-sm sm:text-lg text-slate-600 md:text-xl max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
              AI, Machine Learning, Full-Stack Engineering, and Web3 — taught through hands-on projects with industry-recognized certifications.
            </p>
          </Reveal>

          <Reveal direction="up" delay={0.24}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4 justify-center lg:justify-start">
              <Link 
                to="/programs"
                className="w-full sm:w-auto bg-primary text-white px-7 py-3.5 sm:py-4 rounded-2xl sm:rounded-full text-sm sm:text-base font-extrabold hover:bg-indigo-600 transition-all shadow-glow-primary hover:-translate-y-0.5 active:scale-95 text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Explore Courses</span>
                <ArrowRight size={18} />
              </Link>
              <Link 
                to="/internships"
                className="w-full sm:w-auto bg-white text-slate-800 px-7 py-3.5 sm:py-4 rounded-2xl sm:rounded-full text-sm sm:text-base font-bold border border-slate-200/80 hover:bg-slate-50 transition-all shadow-sm hover:-translate-y-0.5 active:scale-95 text-center flex items-center justify-center cursor-pointer"
              >
                Apply for Internship
              </Link>
            </div>
          </Reveal>

          {/* Trust Badges */}
          <Reveal direction="up" delay={0.3}>
            <div className="pt-4 flex items-center gap-6 justify-center lg:justify-start text-xs font-bold text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5 text-slate-700">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span>Govt &amp; MSME Recognized</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <Code2 size={16} className="text-indigo-500" />
                <span>Project-Driven Curriculum</span>
              </span>
            </div>
          </Reveal>
        </motion.div>

        {/* 3D Scene / Visual Container with Error Boundary */}
        <div className="h-[35vh] sm:h-[45vh] lg:h-[75vh] w-full relative flex items-center justify-center">
          <CanvasErrorBoundary fallback={<HeroVisualFallback />}>
            <Canvas 
              dpr={[1, 1.5]}
              gl={{ antialias: true, powerPreference: 'high-performance' }}
              camera={{ position: [0, 0, 5], fov: 45 }} 
              style={{ touchAction: 'pan-y' }}
            >
              <ambientLight intensity={1.5} />
              <directionalLight position={[10, 10, 5]} intensity={2.5} />
              <pointLight position={[-10, -10, -5]} intensity={1.5} color="#06B6D4" />
              <Suspense fallback={null}>
                <PresentationControls 
                  global 
                  snap={true}
                  rotation={[0, 0, 0]} 
                  polar={[-Math.PI / 4, Math.PI / 4]} 
                  azimuth={[-Math.PI / 4, Math.PI / 4]}
                >
                  <AbstractShapes />
                </PresentationControls>
              </Suspense>
            </Canvas>
          </CanvasErrorBoundary>
        </div>

      </div>
    </section>
  );
}
