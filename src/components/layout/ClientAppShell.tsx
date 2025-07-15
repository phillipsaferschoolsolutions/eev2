"use client";

import React from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/auth-context";
import { LayoutProvider } from "@/context/layout-context";
import { PageShell } from "@/components/layout/PageShell";
import { ThemeBackgroundSetter } from "@/components/layout/ThemeBackgroundSetter";
import { THEME_IDS } from "@/app/layout";


export function ClientAppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem={false}
        themes={THEME_IDS}
        forcedTheme={undefined}
        disableTransitionOnChange={false}
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