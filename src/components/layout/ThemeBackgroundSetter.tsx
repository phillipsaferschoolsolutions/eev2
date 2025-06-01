
"use client";

import React, { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { fetchPexelsImageURL } from '@/services/pexelsService';

export function ThemeBackgroundSetter() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const setBg = async () => {
      if (resolvedTheme === 'theme-nature-embrace') {
        // IMPORTANT SECURITY WARNING:
        // The Pexels API key is used directly on the client-side here.
        // This is INSECURE for a production application.
        // API keys should be protected by using a backend proxy or serverless function.
        // This is for demonstration purposes only.
        console.warn(
          'SECURITY WARNING: Pexels API key is exposed on the client-side in ThemeBackgroundSetter. This is insecure for production.'
        );
        const imageUrl = await fetchPexelsImageURL('lush forest path', 'landscape');
        if (imageUrl) {
          document.documentElement.style.setProperty(
            '--theme-nature-embrace-background-image',
            `url(${imageUrl})`
          );
        } else {
          // Fallback gradient if Pexels fetch fails or returns no image
          document.documentElement.style.setProperty(
            '--theme-nature-embrace-background-image',
            'linear-gradient(to right, #a8e063, #56ab2f)'
          );
        }
      } else {
        // Ensure the custom property is removed for other themes
        document.documentElement.style.removeProperty('--theme-nature-embrace-background-image');
      }
    };

    if (resolvedTheme) {
      setBg();
    }
  }, [resolvedTheme]);

  return null; // This component doesn't render anything itself
}
