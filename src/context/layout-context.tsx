
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type LayoutMode = "standard" | "topNav" | "minimalIcon";

interface LayoutContextType {
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  isMobileViewForLayout: boolean; // To help components adapt for mobile even within a layout
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

const MOBILE_BREAKPOINT_FOR_LAYOUT = 768; // md breakpoint

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>("standard");
  const [isMobileViewForLayout, setIsMobileViewForLayout] = useState(false);

  useEffect(() => {
    const storedLayout = localStorage.getItem('appLayoutMode') as LayoutMode | null;
    if (storedLayout && ["standard", "topNav", "minimalIcon"].includes(storedLayout)) {
      setLayoutModeState(storedLayout);
    }

    const checkMobile = () => {
      setIsMobileViewForLayout(window.innerWidth < MOBILE_BREAKPOINT_FOR_LAYOUT);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode);
    localStorage.setItem('appLayoutMode', mode);
  }, []);

  return (
    <LayoutContext.Provider value={{ layoutMode, setLayoutMode, isMobileViewForLayout }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = (): LayoutContextType => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
