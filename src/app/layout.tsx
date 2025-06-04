
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import React from "react";
import { ClientAppShell } from '@/components/layout/ClientAppShell'; // Changed import

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

// THEME_IDS array is now managed within ClientAppShell.tsx to keep it client-side
// If it were needed by metadata or other server components here, it would need to be defined here or imported.

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
