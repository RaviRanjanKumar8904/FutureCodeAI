import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  className?: string;
  duration?: number;
}

export default function Reveal({ 
  children, 
  delay = 0, 
  direction = 'up', 
  className = '',
  duration = 0.5
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion();

  const directions = {
    up: { y: 22, x: 0 },
    down: { y: -22, x: 0 },
    left: { x: 22, y: 0 },
    right: { x: -22, y: 0 },
    none: { x: 0, y: 0 }
  };

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        ...directions[direction]
      }}
      whileInView={{ 
        opacity: 1, 
        x: 0, 
        y: 0 
      }}
      viewport={{ once: true, margin: "0px 0px -30px 0px", amount: 0.1 }}
      transition={{ 
        duration, 
        delay,
        ease: [0.16, 1, 0.3, 1] // Out-expo: instant start, ultra-smooth settling
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
