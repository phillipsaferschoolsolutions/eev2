
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import { cn } from "@/lib/utils";
import { ClientAppShell } from '@/components/layout/ClientAppShell';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EagleEyED™ - Campus Safety Management",
  description: "Comprehensive campus safety and security management platform.",
};

// Define theme IDs here to ensure they're consistent between server and client components
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
  'theme-aurora-borealis', 'theme-aurora-borealis-dark'
];

export { THEME_IDS };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "antialiased font-sans"
        )}
      >
        <ClientAppShell>{children}</ClientAppShell>
      </body>
    </html>
  );
}
