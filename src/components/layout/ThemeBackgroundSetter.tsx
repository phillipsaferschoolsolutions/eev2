"use client";

import React, { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { fetchPexelsImageURL } from '@/services/pexelsService';
import { motion } from 'framer-motion';

export function ThemeBackgroundSetter() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const setBg = async (themeId: string, query: string, cssVariable: string) => {
      if (resolvedTheme === themeId) {
        // For enhanced themes, we're using glassmorphism instead of background images
        // Clear any existing background image
        document.documentElement.style.removeProperty(cssVariable);
        return;
      }
    };

    const clearOtherThemeVariables = (currentThemeVar: string) => {
      const themeVariables = [
        '--theme-nature-embrace-background-image',
        '--theme-guardian-shield-background-image',
        '--theme-tranquil-library-background-image',
        '--theme-innovation-hub-background-image',
        '--theme-campus-serenity-background-image',
        '--theme-fortress-stone-background-image',
        '--theme-digital-citadel-background-image',
        '--theme-coastal-breeze-background-image',
        '--theme-coastal-breeze-dark-background-image',
        '--theme-urban-pulse-background-image',
        '--theme-urban-pulse-dark-background-image',
        '--theme-forest-whisper-background-image',
        '--theme-forest-whisper-dark-background-image',
        '--theme-desert-mirage-background-image',
        '--theme-desert-mirage-dark-background-image',
        '--theme-mountain-majesty-background-image',
        '--theme-mountain-majesty-dark-background-image',
        '--theme-tech-horizon-background-image',
        '--theme-tech-horizon-dark-background-image',
        '--theme-tropical-paradise-background-image',
        '--theme-tropical-paradise-dark-background-image',
        '--theme-aurora-borealis-background-image',
        '--theme-aurora-borealis-dark-background-image',
      ];
      themeVariables.forEach(variable => {
        if (variable !== currentThemeVar) {
          document.documentElement.style.removeProperty(variable);
        }
      });
    };
    
    if (resolvedTheme) {
      // Original themes
      if (resolvedTheme === 'theme-nature-embrace') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-guardian-shield') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-tranquil-library') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-innovation-hub') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-campus-serenity') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-fortress-stone') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-digital-citadel') {
        clearOtherThemeVariables('');
      } 
      
      // New enhanced themes
      else if (resolvedTheme === 'theme-coastal-breeze') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-coastal-breeze-dark') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-urban-pulse') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-urban-pulse-dark') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-forest-whisper') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-forest-whisper-dark') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-desert-mirage') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-desert-mirage-dark') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-mountain-majesty') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-mountain-majesty-dark') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-tech-horizon') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-tech-horizon-dark') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-tropical-paradise') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-tropical-paradise-dark') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-aurora-borealis') {
        clearOtherThemeVariables('');
      } else if (resolvedTheme === 'theme-aurora-borealis-dark') {
        clearOtherThemeVariables('');
      } else {
        // For any other theme that is not photo-heavy, clear all photo background variables
        clearOtherThemeVariables(''); // Pass empty string to clear all
      }
    }
  }, [resolvedTheme]);

  return (
    <motion.div 
      className="fixed inset-0 pointer-events-none z-[-1]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* This div can be used for additional background effects */}
    </motion.div>
  ); 
}