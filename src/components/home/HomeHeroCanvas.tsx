import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PresentationControls, Icosahedron, TorusKnot, Float } from '@react-three/drei';
import * as THREE from 'three';

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

export default function HomeHeroCanvas() {
  return (
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
  );
}
