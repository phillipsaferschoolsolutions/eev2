
"use client";

import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading page content"
    >
      <div className="relative flex items-center justify-center">
        <Eye className="h-16 w-16 text-primary animate-pulse-opacity" />
      </div>
      <p className="mt-4 text-lg font-medium text-foreground animate-pulse-opacity animation-delay-200">
        Loading...
      </p>
      <style jsx>{`
        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.6; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        .animate-pulse-opacity {
          animation: pulse-opacity 2s infinite ease-in-out;
        }
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
      `}</style>
    </div>
  );
}
