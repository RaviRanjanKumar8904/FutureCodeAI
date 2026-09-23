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
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-primary/10 sm:bg-primary/15 blur-[40px] sm:blur-[80px] mix-blend-multiply will-change-transform transform-gpu pointer-events-none" 
      />
      
      <motion.div 
        animate={shouldReduceMotion ? {} : { x: [0, -40, 0], y: [0, 50, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] max-w-[450px] max-h-[450px] rounded-full bg-secondary/10 sm:bg-secondary/15 blur-[40px] sm:blur-[80px] mix-blend-multiply will-change-transform transform-gpu pointer-events-none" 
      />
      
      <motion.div 
        animate={shouldReduceMotion ? {} : { x: [0, 35, 0], y: [0, 35, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="hidden sm:block absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full bg-accent/15 blur-[90px] mix-blend-multiply will-change-transform transform-gpu pointer-events-none" 
      />
    </div>
  );
}
