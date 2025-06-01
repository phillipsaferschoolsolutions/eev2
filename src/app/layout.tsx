
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { ThemeProvider, useTheme } from "next-themes"; // Added useTheme here
import { AuthProvider } from "@/context/auth-context";
import { LayoutProvider } from "@/context/layout-context";
import { PageShell } from "@/components/layout/PageShell";
import { fetchPexelsImageURL } from "@/services/pexelsService";
import React from "react";

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
  'theme-nature-embrace',
];

// Wrapper component to correctly use useTheme from next-themes
function ThemeSpecificBackgroundSetterWrapper() {
  const { resolvedTheme } = useTheme(); // Use the hook from next-themes

  React.useEffect(() => {
    const setBg = async () => {
      if (resolvedTheme === 'theme-nature-embrace') {
        // IMPORTANT SECURITY WARNING:
        // The Pexels API key is used directly on the client-side here.
        // This is INSECURE for a production application.
        // API keys should be protected by using a backend proxy or serverless function.
        // This is for demonstration purposes only due to the prompt's request.
        console.warn("SECURITY WARNING: Pexels API key is exposed on the client-side in ThemeSpecificBackgroundSetterWrapper. This is insecure for production.");
        const imageUrl = await fetchPexelsImageURL('lush forest path', 'landscape');
        if (imageUrl) {
          document.documentElement.style.setProperty('--theme-nature-embrace-background-image', `url(${imageUrl})`);
        } else {
          document.documentElement.style.setProperty('--theme-nature-embrace-background-image', 'linear-gradient(to right, #a8e063, #56ab2f)'); // Fallback gradient
        }
      } else {
        document.documentElement.style.removeProperty('--theme-nature-embrace-background-image');
      }
    };

    if (resolvedTheme) {
      setBg();
    }
  }, [resolvedTheme]);

  return null;
}


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
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            themes={THEME_IDS}
          >
            <LayoutProvider>
              <SidebarProvider>
                <ThemeSpecificBackgroundSetterWrapper /> {/* Correct placement */}
                <PageShell>{children}</PageShell>
                <Toaster />
              </SidebarProvider>
            </LayoutProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
