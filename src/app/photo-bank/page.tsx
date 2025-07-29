"use client";

import { PhotoBank } from '@/components/ui/photo-bank';

export default function PhotoBankPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Photo Bank</h1>
        <p className="text-lg text-muted-foreground">
          Manage all photos uploaded from assignments and questions in one centralized location.
        </p>
      </div>

      <PhotoBank />
    </div>
  );
}