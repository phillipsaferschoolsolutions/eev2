
"use client";

import React from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/auth-context";
import { LayoutProvider } from "@/context/layout-context";
import { PageShell } from "@/components/layout/PageShell";
import { ThemeBackgroundSetter } from "@/components/layout/ThemeBackgroundSetter";

// This list needs to be consistent with the one in src/app/layout.tsx
// Ideally, this would be imported from a shared constants file if it grows further.
const THEME_IDS = [
  'light', 'dark', 'corporate-blue', 'matrix', 'desert-light', 'ocean-deep',
  'spring-meadow', 'slate-contrast', 'high-contrast-dark', 'high-contrast-light',
  'solar-flare-light', 'solar-flare-dark', 'nebula-night-light', 'nebula-night-dark',
  'emerald-forest-light', 'emerald-forest-dark', 'cyber-city-light', 'cyber-city-dark',
  'arctic-horizon-light', 'arctic-horizon-dark', 'volcanic-glow-light', 'volcanic-glow-dark',
  'coral-reef-light', 'coral-reef-dark', 'retro-funk-light', 'retro-funk-dark',
  'urban-jungle-light', 'urban-jungle-dark', 'vintage-paper-light', 'vintage-paper-dark',
  'digital-dreams-light', 'digital-dreams-dark', 'crystal-frost-light', 'crystal-frost-dark',
  'ethereal-veil-light', 'ethereal-veil-dark', 'chromatic-glaze-light', 'chromatic-glaze-dark',
  'theme-nature-embrace', 'theme-guardian-shield', 'theme-tranquil-library',
  'theme-innovation-hub', 'theme-campus-serenity', 'theme-fortress-stone', 'theme-digital-citadel'
];

export function ClientAppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        themes={THEME_IDS}
      >
        <LayoutProvider>
          <SidebarProvider>
            <ThemeBackgroundSetter />
            <PageShell>{children}</PageShell>
            <Toaster />
          </SidebarProvider>
        </LayoutProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
