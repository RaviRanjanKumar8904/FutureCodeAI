import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PresentationControls, Icosahedron, TorusKnot, Float, Environment } from '@react-three/drei';
import { motion, useScroll, useTransform } from 'framer-motion';
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
  const y1 = useTransform(scrollY, [0, 800], [0, 80]);
  const opacity = useTransform(scrollY, [0, 600], [1, 0.2]);

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl grid lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Text Content */}
        <motion.div 
          style={{ y: y1, opacity }} 
          className="space-y-8"
        >
          <Reveal direction="up" delay={0.05}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white shadow-premium-card text-sm font-semibold text-primary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Powered by FutureCodeAI
            </div>
          </Reveal>
          
          <Reveal direction="up" delay={0.12}>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.1] md:leading-[1.05] text-text-heading tracking-tight">
              Learn the Technology That <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-secondary drop-shadow-sm">
                Builds Tomorrow
              </span>
            </h1>
          </Reveal>

          <Reveal direction="up" delay={0.18}>
            <p className="text-base sm:text-lg text-slate-500 md:text-xl max-w-xl leading-relaxed font-medium">
              AI, ML, Full-Stack Development & more — taught inside your own coaching institute.
            </p>
          </Reveal>

          <Reveal direction="up" delay={0.24}>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-full text-base font-bold hover:bg-indigo-500 transition-all shadow-glow-primary hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] hover:-translate-y-1 active:scale-95 text-center">
                Explore Courses
              </button>
              <button className="w-full sm:w-auto bg-white text-text-heading px-8 py-4 rounded-full text-base font-bold border border-gray-100 hover:border-gray-200 transition-all shadow-soft hover:shadow-soft-lg hover:-translate-y-1 active:scale-95 text-center">
                Apply for Internship
              </button>
            </div>
          </Reveal>
        </motion.div>

        {/* 3D Scene */}
        <div className="h-[45vh] sm:h-[50vh] lg:h-[80vh] w-full relative -mt-8 lg:mt-0 flex items-center justify-center">
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
