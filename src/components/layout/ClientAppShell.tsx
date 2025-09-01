"use client";

import React from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/auth-context";
import { LayoutProvider } from "@/context/layout-context";
import { NotificationProvider } from "@/context/notification-context";
import { PageShell } from "@/components/layout/PageShell";
import { ThemeBackgroundSetter } from "@/components/layout/ThemeBackgroundSetter";
import { PhotoBankProvider } from "@/context/photo-bank-context";

// Define theme IDs here to avoid circular dependency
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
  'theme-innovation-hub', 'theme-campus-serenity', 'theme-fortress-stone', 'theme-digital-citadel',
  'theme-coastal-breeze', 'theme-coastal-breeze-dark',
  'theme-urban-pulse', 'theme-urban-pulse-dark',
  'theme-forest-whisper', 'theme-forest-whisper-dark',
  'theme-desert-mirage', 'theme-desert-mirage-dark',
  'theme-mountain-majesty', 'theme-mountain-majesty-dark',
  'theme-tech-horizon', 'theme-tech-horizon-dark',
  'theme-tropical-paradise', 'theme-tropical-paradise-dark',
  'theme-aurora-borealis', 'theme-aurora-borealis-dark',
  // NEW BOLD ENHANCED THEMES
  'theme-neon-pulse', 'theme-neon-pulse-dark',
  'theme-solar-flare', 'theme-solar-flare-dark',
  'theme-cyberpunk', 'theme-cyberpunk-dark',
  'theme-aurora-storm', 'theme-aurora-storm-dark',
  'theme-volcanic-ice', 'theme-volcanic-ice-dark'
];

export function ClientAppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PhotoBankProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={false}
          themes={THEME_IDS}
          forcedTheme={undefined}
          disableTransitionOnChange={false}
        >
          <LayoutProvider>
            <NotificationProvider>
              <SidebarProvider>
                <ThemeBackgroundSetter />
                <PageShell>{children}</PageShell>
                <Toaster />
              </SidebarProvider>
            </NotificationProvider>
          </LayoutProvider>
        </ThemeProvider>
      </PhotoBankProvider>
    </AuthProvider>
  );
}