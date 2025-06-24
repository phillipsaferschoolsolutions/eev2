"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { AnimatedBackground } from '@/components/ui/animated-background';

interface ThemeCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  isDark: boolean;
  gradient: string;
  index: number;
  isEnhanced?: boolean;
}

export function ThemeCard({
  id,
  name,
  description,
  icon: Icon,
  isDark,
  gradient,
  index,
  isEnhanced = false,
}: ThemeCardProps) {
  const { theme: currentTheme, setTheme } = useTheme();
  const isActive = currentTheme === id;
  
  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: index * 0.05,
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    hover: {
      y: -8,
      scale: 1.03,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  // Animation variants for the icon
  const iconVariants = {
    hidden: { scale: 0.8, opacity: 0, rotate: -10 },
    visible: { 
      scale: 1, 
      opacity: 1,
      rotate: 0,
      transition: { 
        delay: 0.2,
        duration: 0.5,
        ease: "backOut"
      }
    },
    hover: { 
      scale: 1.2,
      rotate: [0, 10, -10, 0],
      transition: { 
        duration: 1,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "mirror"
      }
    }
  };

  // Determine animation type based on theme id
  const getAnimationType = () => {
    if (id.includes('coastal')) return 'waves';
    if (id.includes('forest')) return 'leaves';
    if (id.includes('urban')) return 'cityLights';
    if (id.includes('desert')) return 'desert';
    if (id.includes('mountain') || id.includes('aurora')) return 'stars';
    if (id.includes('tech')) return 'tech';
    if (id.includes('tropical')) return 'particles';
    return 'particles';
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      custom={index}
      className="h-full"
    >
      <Card className="overflow-hidden flex flex-col h-full">
        <CardHeader className="p-0">
          <div
            className={`h-32 w-full flex items-center justify-center relative overflow-hidden ${gradient}`}
            data-ai-hint="theme color palette"
          >
            {isEnhanced && (
              <AnimatedBackground type={getAnimationType()} className="absolute inset-0" />
            )}
            <motion.div
              variants={iconVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              className="relative z-10"
            >
              <Icon className={`h-12 w-12 ${isDark ? 'text-white/90' : 'text-neutral-900/90'}`} />
            </motion.div>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow flex flex-col">
          <motion.h3 
            className="text-lg font-semibold mb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {name}
          </motion.h3>
          <motion.p 
            className="text-sm text-muted-foreground mb-3 flex-grow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {description}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={() => setTheme(id)}
              className="w-full mt-auto"
              variant={isActive ? "default" : "outline"}
            >
              {isActive ? "Active Theme" : "Apply Theme"}
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}