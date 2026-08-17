import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PresentationControls, Icosahedron, TorusKnot, Float, Environment } from '@react-three/drei';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import Reveal from '../Reveal';
import * as THREE from 'three';

function AbstractShapes() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.5} rotationIntensity={1} floatIntensity={2}>
        <Icosahedron args={[1, 0]} position={[-1.5, 0.5, 0]}>
          <meshPhysicalMaterial 
            color="#4F46E5" 
            roughness={0.1} 
            metalness={0.8} 
            clearcoat={1} 
            clearcoatRoughness={0.1}
          />
        </Icosahedron>
      </Float>
      
      <Float speed={2} rotationIntensity={1.5} floatIntensity={1.5}>
        <TorusKnot args={[0.6, 0.2, 128, 32]} position={[1.5, -0.5, -1]}>
          <meshPhysicalMaterial 
            color="#06B6D4" 
            roughness={0.2} 
            metalness={0.9}
            clearcoat={0.5}
          />
        </TorusKnot>
      </Float>
    </group>
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
        </motion.div>

        {/* 3D Scene */}
        <div className="h-[35vh] sm:h-[45vh] lg:h-[75vh] w-full relative flex items-center justify-center">
          <Canvas 
            dpr={[1, 1.5]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            camera={{ position: [0, 0, 5], fov: 45 }} 
            style={{ touchAction: 'pan-y' }}
          >
            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 10, 5]} intensity={2} />
            <Suspense fallback={null}>
              <Environment preset="city" />
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
        </div>

      </div>
    </section>
  );
}
