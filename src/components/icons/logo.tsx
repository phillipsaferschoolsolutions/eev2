"use client"; // Required for useState and useEffect

import { Eye } from 'lucide-react';
import type React from 'react';
import { useState, useEffect } from 'react';

export function Logo(props: React.HTMLAttributes<HTMLDivElement>) {
  const [logoText, setLogoText] = useState("EagleEyED");

  useEffect(() => {
    setLogoText("EagleEyED™");
  }, []);

  return (
    <div className="flex items-center gap-2" {...props}>
      <Eye className="h-7 w-7 text-sidebar-primary" />
      <span className="text-2xl font-bold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-sidebar-primary to-sidebar-primary/80 drop-shadow-sm">
          {logoText}
        </span>
      </span>
    </div>
  );
}