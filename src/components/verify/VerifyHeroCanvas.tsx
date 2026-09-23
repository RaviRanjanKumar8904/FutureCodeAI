import { Canvas } from '@react-three/fiber';
import { Float, PresentationControls, Octahedron, Edges } from '@react-three/drei';

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

export default function VerifyHeroCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
      <ambientLight intensity={1.8} />
      <directionalLight position={[10, 10, 5]} intensity={2.5} />
      <TrustShield />
    </Canvas>
  );
}
