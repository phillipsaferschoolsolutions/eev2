
"use client";

import React, { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { fetchPexelsImageURL } from '@/services/pexelsService';

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
      ];
      themeVariables.forEach(variable => {
        if (variable !== currentThemeVar) {
          document.documentElement.style.removeProperty(variable);
        }
      });
    };
    
    if (resolvedTheme) {
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
      } else {
        // For any other theme that is not photo-heavy, clear all photo background variables
        clearOtherThemeVariables(''); // Pass empty string to clear all
      }
    }
  }, [resolvedTheme]);

  return null; 
}
