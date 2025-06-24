"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

interface AnimatedBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  type?: 'waves' | 'particles' | 'leaves' | 'cityLights' | 'stars' | 'desert' | 'aurora' | 'tech';
}

export function AnimatedBackground({ 
  children, 
  className = "", 
  type = 'waves' 
}: AnimatedBackgroundProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [elements, setElements] = useState<React.ReactNode[]>([]);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const isDark = resolvedTheme?.includes('dark');
    const count = type === 'particles' ? 30 : 
                 type === 'leaves' ? 15 : 
                 type === 'cityLights' ? 20 :
                 type === 'stars' ? 50 :
                 type === 'desert' ? 10 :
                 type === 'aurora' ? 5 :
                 type === 'tech' ? 25 : 8;
    
    const newElements: React.ReactNode[] = [];
    
    for (let i = 0; i < count; i++) {
      const size = Math.random() * 100 + 50;
      const xPos = Math.random() * 100;
      const yPos = Math.random() * 100;
      const duration = Math.random() * 20 + 10;
      const delay = Math.random() * 5;
      
      if (type === 'waves') {
        newElements.push(
          <motion.div
            key={`wave-${i}`}
            className={`absolute rounded-full opacity-10 ${isDark ? 'bg-blue-500' : 'bg-blue-300'}`}
            style={{
              width: size,
              height: size / 2,
              borderRadius: '50%',
              left: `${xPos}%`,
              top: `${yPos}%`,
            }}
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: duration,
              delay: delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        );
      } else if (type === 'particles') {
        newElements.push(
          <motion.div
            key={`particle-${i}`}
            className={`absolute rounded-full ${isDark ? 'bg-primary/20' : 'bg-primary/10'}`}
            style={{
              width: Math.random() * 10 + 2,
              height: Math.random() * 10 + 2,
              left: `${xPos}%`,
              top: `${yPos}%`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              opacity: [0.1, 0.5, 0.1],
            }}
            transition={{
              duration: duration,
              delay: delay,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          />
        );
      } else if (type === 'leaves') {
        newElements.push(
          <motion.div
            key={`leaf-${i}`}
            className={`absolute ${isDark ? 'text-green-600' : 'text-green-500'}`}
            style={{
              left: `${xPos}%`,
              top: `${yPos}%`,
              fontSize: `${Math.random() * 20 + 10}px`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 + 50],
              rotate: [0, Math.random() * 360],
              opacity: [0, 0.7, 0],
            }}
            transition={{
              duration: duration,
              delay: delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            🍃
          </motion.div>
        );
      } else if (type === 'cityLights') {
        const colors = isDark 
          ? ['bg-purple-500', 'bg-blue-500', 'bg-pink-500', 'bg-cyan-500'] 
          : ['bg-yellow-300', 'bg-orange-300', 'bg-red-300', 'bg-amber-300'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        newElements.push(
          <motion.div
            key={`light-${i}`}
            className={`absolute rounded-full ${color} blur-sm`}
            style={{
              width: Math.random() * 8 + 2,
              height: Math.random() * 8 + 2,
              left: `${xPos}%`,
              bottom: `${Math.random() * 30}%`,
            }}
            animate={{
              opacity: [0.1, 0.7, 0.1],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: Math.random() * 2 + 1,
              delay: delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        );
      } else if (type === 'stars') {
        newElements.push(
          <motion.div
            key={`star-${i}`}
            className="absolute bg-white rounded-full"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              left: `${xPos}%`,
              top: `${yPos}%`,
            }}
            animate={{
              opacity: [0.1, 0.8, 0.1],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              delay: delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        );
      } else if (type === 'desert') {
        newElements.push(
          <motion.div
            key={`sand-${i}`}
            className={`absolute rounded-full ${isDark ? 'bg-amber-700/20' : 'bg-amber-300/20'}`}
            style={{
              width: Math.random() * 20 + 5,
              height: Math.random() * 20 + 5,
              left: `${xPos}%`,
              bottom: `${Math.random() * 20}%`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * -50],
              opacity: [0, 0.3, 0],
            }}
            transition={{
              duration: duration,
              delay: delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        );
      } else if (type === 'aurora') {
        const colors = [
          'bg-gradient-to-r from-green-500/20 to-blue-500/20',
          'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
          'bg-gradient-to-r from-blue-500/20 to-teal-500/20',
          'bg-gradient-to-r from-pink-500/20 to-purple-500/20',
          'bg-gradient-to-r from-teal-500/20 to-green-500/20',
        ];
        const color = colors[i % colors.length];
        
        newElements.push(
          <motion.div
            key={`aurora-${i}`}
            className={`absolute ${color} blur-xl`}
            style={{
              width: Math.random() * 300 + 200,
              height: Math.random() * 100 + 50,
              left: `${xPos}%`,
              top: `${Math.random() * 50}%`,
              borderRadius: '50%',
            }}
            animate={{
              x: [0, Math.random() * 50 - 25],
              scaleX: [1, 1.1, 0.9, 1],
              scaleY: [1, 1.2, 0.8, 1],
            }}
            transition={{
              duration: Math.random() * 20 + 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        );
      } else if (type === 'tech') {
        const lineLength = Math.random() * 100 + 50;
        const lineWidth = Math.random() * 2 + 1;
        const rotation = Math.random() * 360;
        
        newElements.push(
          <motion.div
            key={`tech-${i}`}
            className={`absolute ${isDark ? 'bg-blue-500/20' : 'bg-blue-400/10'}`}
            style={{
              width: lineLength,
              height: lineWidth,
              left: `${xPos}%`,
              top: `${yPos}%`,
              transform: `rotate(${rotation}deg)`,
            }}
            animate={{
              opacity: [0.1, 0.5, 0.1],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: Math.random() * 5 + 3,
              delay: delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        );
      }
    }
    
    setElements(newElements);
  }, [mounted, resolvedTheme, type]);

  if (!mounted) return null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 overflow-hidden">
        {elements}
      </div>
      {children}
    </div>
  );
}