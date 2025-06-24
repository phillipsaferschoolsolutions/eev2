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
        if (!process.env.NEXT_PUBLIC_PEXEL_API_KEY) {
          console.warn(
            `PEXELS API key (NEXT_PUBLIC_PEXEL_API_KEY) is not set. Using fallback for ${themeId}.`
          );
          // Fallback gradient is defined in globals.css, so no explicit set needed here
          // We just need to ensure any old image variable is cleared if this one fails
          document.documentElement.style.removeProperty(cssVariable);
          return;
        }
        console.log(`Fetching Pexels image for theme: ${themeId} with query: "${query}"`);
        const imageUrl = await fetchPexelsImageURL(query, 'landscape');
        if (imageUrl) {
          document.documentElement.style.setProperty(cssVariable, `url(${imageUrl})`);
        } else {
          console.warn(`Failed to fetch Pexels image for ${themeId}. Using fallback gradient.`);
          // Fallback gradient is defined in globals.css, ensure variable is cleared if fetch fails
          document.documentElement.style.removeProperty(cssVariable);
        }
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
        clearOtherThemeVariables('--theme-nature-embrace-background-image');
        setBg('theme-nature-embrace', 'lush forest canopy', '--theme-nature-embrace-background-image');
      } else if (resolvedTheme === 'theme-guardian-shield') {
        clearOtherThemeVariables('--theme-guardian-shield-background-image');
        setBg('theme-guardian-shield', 'abstract security shield metallic', '--theme-guardian-shield-background-image');
      } else if (resolvedTheme === 'theme-tranquil-library') {
        clearOtherThemeVariables('--theme-tranquil-library-background-image');
        setBg('theme-tranquil-library', 'quiet library bookshelf peaceful', '--theme-tranquil-library-background-image');
      } else if (resolvedTheme === 'theme-innovation-hub') {
        clearOtherThemeVariables('--theme-innovation-hub-background-image');
        setBg('theme-innovation-hub', 'modern university architecture bright sky', '--theme-innovation-hub-background-image');
      } else if (resolvedTheme === 'theme-campus-serenity') {
        clearOtherThemeVariables('--theme-campus-serenity-background-image');
        setBg('theme-campus-serenity', 'university campus green lawn sunny day', '--theme-campus-serenity-background-image');
      } else if (resolvedTheme === 'theme-fortress-stone') {
        clearOtherThemeVariables('--theme-fortress-stone-background-image');
        setBg('theme-fortress-stone', 'ancient stone wall texture castle detail', '--theme-fortress-stone-background-image');
      } else if (resolvedTheme === 'theme-digital-citadel') {
        clearOtherThemeVariables('--theme-digital-citadel-background-image');
        setBg('theme-digital-citadel', 'abstract cyber security network blue glow', '--theme-digital-citadel-background-image');
      } 
      
      // New enhanced themes
      else if (resolvedTheme === 'theme-coastal-breeze') {
        clearOtherThemeVariables('--theme-coastal-breeze-background-image');
        setBg('theme-coastal-breeze', 'serene ocean coastline beach waves', '--theme-coastal-breeze-background-image');
      } else if (resolvedTheme === 'theme-coastal-breeze-dark') {
        clearOtherThemeVariables('--theme-coastal-breeze-dark-background-image');
        setBg('theme-coastal-breeze-dark', 'night ocean moonlight waves', '--theme-coastal-breeze-dark-background-image');
      } else if (resolvedTheme === 'theme-urban-pulse') {
        clearOtherThemeVariables('--theme-urban-pulse-background-image');
        setBg('theme-urban-pulse', 'vibrant city skyline daytime', '--theme-urban-pulse-background-image');
      } else if (resolvedTheme === 'theme-urban-pulse-dark') {
        clearOtherThemeVariables('--theme-urban-pulse-dark-background-image');
        setBg('theme-urban-pulse-dark', 'night city neon lights', '--theme-urban-pulse-dark-background-image');
      } else if (resolvedTheme === 'theme-forest-whisper') {
        clearOtherThemeVariables('--theme-forest-whisper-background-image');
        setBg('theme-forest-whisper', 'sunlight through forest trees', '--theme-forest-whisper-background-image');
      } else if (resolvedTheme === 'theme-forest-whisper-dark') {
        clearOtherThemeVariables('--theme-forest-whisper-dark-background-image');
        setBg('theme-forest-whisper-dark', 'mystical night forest moonlight', '--theme-forest-whisper-dark-background-image');
      } else if (resolvedTheme === 'theme-desert-mirage') {
        clearOtherThemeVariables('--theme-desert-mirage-background-image');
        setBg('theme-desert-mirage', 'desert sand dunes daytime', '--theme-desert-mirage-background-image');
      } else if (resolvedTheme === 'theme-desert-mirage-dark') {
        clearOtherThemeVariables('--theme-desert-mirage-dark-background-image');
        setBg('theme-desert-mirage-dark', 'desert night stars', '--theme-desert-mirage-dark-background-image');
      } else if (resolvedTheme === 'theme-mountain-majesty') {
        clearOtherThemeVariables('--theme-mountain-majesty-background-image');
        setBg('theme-mountain-majesty', 'majestic mountain peaks daytime', '--theme-mountain-majesty-background-image');
      } else if (resolvedTheme === 'theme-mountain-majesty-dark') {
        clearOtherThemeVariables('--theme-mountain-majesty-dark-background-image');
        setBg('theme-mountain-majesty-dark', 'mountain night aurora', '--theme-mountain-majesty-dark-background-image');
      } else if (resolvedTheme === 'theme-tech-horizon') {
        clearOtherThemeVariables('--theme-tech-horizon-background-image');
        setBg('theme-tech-horizon', 'futuristic technology interface', '--theme-tech-horizon-background-image');
      } else if (resolvedTheme === 'theme-tech-horizon-dark') {
        clearOtherThemeVariables('--theme-tech-horizon-dark-background-image');
        setBg('theme-tech-horizon-dark', 'dark cyberpunk technology', '--theme-tech-horizon-dark-background-image');
      } else if (resolvedTheme === 'theme-tropical-paradise') {
        clearOtherThemeVariables('--theme-tropical-paradise-background-image');
        setBg('theme-tropical-paradise', 'tropical beach palm trees', '--theme-tropical-paradise-background-image');
      } else if (resolvedTheme === 'theme-tropical-paradise-dark') {
        clearOtherThemeVariables('--theme-tropical-paradise-dark-background-image');
        setBg('theme-tropical-paradise-dark', 'tropical beach night', '--theme-tropical-paradise-dark-background-image');
      } else if (resolvedTheme === 'theme-aurora-borealis') {
        clearOtherThemeVariables('--theme-aurora-borealis-background-image');
        setBg('theme-aurora-borealis', 'northern lights aurora daytime', '--theme-aurora-borealis-background-image');
      } else if (resolvedTheme === 'theme-aurora-borealis-dark') {
        clearOtherThemeVariables('--theme-aurora-borealis-dark-background-image');
        setBg('theme-aurora-borealis-dark', 'northern lights aurora night', '--theme-aurora-borealis-dark-background-image');
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