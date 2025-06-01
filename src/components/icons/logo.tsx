
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
      <Eye className="h-7 w-7 text-primary" />
      <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent group-data-[collapsible=icon]:hidden">
        {logoText}
      </span>
    </div>
  );
}
