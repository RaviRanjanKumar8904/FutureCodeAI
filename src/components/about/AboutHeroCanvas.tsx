import { Canvas } from '@react-three/fiber';
import { Float, PresentationControls, Icosahedron, Edges } from '@react-three/drei';

function TechCore() {
  return (
    <Float speed={2.5} rotationIntensity={1.5} floatIntensity={2}>
      <PresentationControls
        global={false}
        cursor={true}
        snap={true}
        speed={1.5}
        zoom={1}
        polar={[-0.2, 0.2]}
        azimuth={[-Math.PI / 4, Math.PI / 4]}
      >
        <Icosahedron args={[1.5, 0]}>
          <meshBasicMaterial color="#1E293B" wireframe={true} />
          <Edges scale={1.1} threshold={15} color="#4F46E5" />
        </Icosahedron>
        
        <Icosahedron args={[1, 1]} rotation={[Math.PI / 4, 0, 0]}>
          <meshBasicMaterial color="#06B6D4" wireframe={true} />
        </Icosahedron>
      </PresentationControls>
    </Float>
  );
}

export default function AboutHeroCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 10, 5]} intensity={2} />
      <TechCore />
    </Canvas>
  );
}
