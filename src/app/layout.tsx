
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/auth-context";
import { LayoutProvider } from "@/context/layout-context"; // New
import { PageShell } from "@/components/layout/PageShell"; // New

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
];

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
            <LayoutProvider> {/* New LayoutProvider wraps SidebarProvider and PageShell */}
              <SidebarProvider> {/* SidebarProvider wraps PageShell */}
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
