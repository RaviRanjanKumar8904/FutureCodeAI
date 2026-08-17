import { motion, useReducedMotion } from 'framer-motion';

export default function BackgroundBlobs() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-surface">
      {/* Subtle tech grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e50a_1px,transparent_1px),linear-gradient(to_bottom,#4f46e50a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      <motion.div 
        animate={shouldReduceMotion ? {} : { x: [0, 50, 0], y: [0, -25, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/15 blur-[80px] mix-blend-multiply will-change-transform transform-gpu" 
      />
      
      <motion.div 
        animate={shouldReduceMotion ? {} : { x: [0, -40, 0], y: [0, 50, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-secondary/15 blur-[80px] mix-blend-multiply will-change-transform transform-gpu" 
      />
      
      <motion.div 
        animate={shouldReduceMotion ? {} : { x: [0, 35, 0], y: [0, 35, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-accent/15 blur-[90px] mix-blend-multiply will-change-transform transform-gpu" 
      />
    </div>
  );
}
