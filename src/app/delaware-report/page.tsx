// src/app/delaware-report/page.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Assuming you have Card components

export default function DelawareReportPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Delaware Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-hidden" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio Container */}
             <iframe
                width="100%" // Set width to 100% to fill container
                height="100%" // Set height to 100% to fill container
                src="https://lookerstudio.google.com/embed/reporting/4f4ca4e6-dc12-43a8-b3cf-1f8cc03e2179/page/p_5tfugos7sd"
                frameBorder="0"
                style={{ border: 0, position: 'absolute', top: 0, left: 0 }} // Style for absolute positioning within container
                allowFullScreen // Allow full screen
                sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
             ></iframe>
          </div>
           <p className="text-sm text-muted-foreground mt-4">
              This report is embedded from Google Data Studio.
           </p>
        </CardContent>
      </Card>
    </div>
  );
}
