
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/auth-context";
// import { PageLoader } from "@/components/layout/page-loader"; // Example for future integration

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
  'light', 
  'dark', 
  'corporate-blue', 
  'matrix', 
  'desert-light', 
  'ocean-deep', 
  'spring-meadow', 
  'slate-contrast', 
  'high-contrast-dark',
  'high-contrast-light',
  'solar-flare-light',
  'solar-flare-dark',
  'nebula-night-light',
  'nebula-night-dark',
  'emerald-forest-light',
  'emerald-forest-dark',
  'cyber-city-light',
  'cyber-city-dark',
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
            {/* 
              Future Page Loader Integration Example:
              You could wrap {children} with a React.Suspense boundary 
              and provide <PageLoader /> as the fallback.
              Alternatively, for more control over route changes,
              you might listen to Next.js router events to show/hide the loader.
              e.g.,
              <React.Suspense fallback={<PageLoader />}>
                {children}
              </React.Suspense> 
            */}
            <SidebarProvider>
              <AppSidebar />
              <div className="flex flex-col flex-1 min-h-screen">
                <AppHeader />
                <SidebarInset className="flex-grow">
                  <main className="p-4 sm:p-6 lg:p-8 flex-grow">
                    {children}
                  </main>
                </SidebarInset>
              </div>
              <Toaster />
            </SidebarProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
