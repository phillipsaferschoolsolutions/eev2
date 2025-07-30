"use client";

import React, { useState, useEffect } from 'react';
import type { PivotTableData } from '@/types/Analysis';
import { Skeleton } from '@/components/ui/skeleton';

interface PivotTableComponentProps {
  data: PivotTableData[];
}

export default function PivotTableComponent({ data }: PivotTableComponentProps) {
  const [pivotState, setPivotState] = useState({});
  const [isClient, setIsClient] = useState(false);
  const [PivotTableUI, setPivotTableUI] = useState<any>(null);

  // Use useEffect to ensure we only render the pivot table on the client
  useEffect(() => {
    setIsClient(true);
    
    // Dynamically import the pivot table component to avoid SSR issues
    const loadPivotTable = async () => {
      try {
        // Import CSS first
        await import('react-pivottable/pivottable.css');
        // Then import the component
        const module = await import('react-pivottable/PivotTableUI');
        setPivotTableUI(() => module.default);
      } catch (error) {
        console.error('Failed to load pivot table:', error);
      }
    };
    
    loadPivotTable();
  }, []);

  // If no data, show a message
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-md">
        <p className="text-muted-foreground">No data available. Please adjust your filters and try again.</p>
      </div>
    );
  }

  // If we're on the server or haven't mounted yet, show a skeleton
  if (!isClient || !PivotTableUI) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Initial pivot table configuration
  const initialPivotState = {
    rows: ['questionLabel'],
    cols: ['locationName'],
    aggregatorName: 'Count',
    vals: ['value'],
    rendererName: 'Table',
    sorters: {},
    tableOptions: {
      clickCallback: (e: unknown, value: unknown, filters: unknown, pivotData: unknown) => {
        console.log(e, value, filters, pivotData);
      }
    }
  };

  return (
    <div className="pivot-table-container">
      <PivotTableUI
        data={data}
        onChange={(s: any) => setPivotState(s)}
        {...initialPivotState}
        {...pivotState}
      />
      <style jsx global>{`
        .pvtUi {
          color: var(--foreground);
          font-family: var(--font-geist-sans);
        }
        .pvtUi select {
          color: var(--foreground);
          background-color: var(--background);
          border: 1px solid var(--border);
          border-radius: 0.375rem;
          padding: 0.25rem 0.5rem;
        }
        .pvtAxisContainer, .pvtVals, .pvtRenderers, .pvtAggregators {
          background-color: var(--background);
          border: 1px solid var(--border);
          border-radius: 0.375rem;
        }
        .pvtAxisContainer li span.pvtAttr {
          background-color: var(--primary);
          color: var(--primary-foreground);
          border: none;
          border-radius: 0.25rem;
        }
        .pvtCheckContainer {
          background-color: var(--background);
          border: 1px solid var(--border);
          border-radius: 0.375rem;
        }
        .pvtCheckContainer p {
          color: var(--foreground);
        }
        .pvtCheckContainer input[type="checkbox"] {
          accent-color: var(--primary);
        }
        .pvtTable {
          border-collapse: collapse;
          border: 1px solid var(--border);
          font-size: 0.875rem;
        }
        .pvtTable thead tr th, .pvtTable tbody tr th {
          background-color: var(--muted);
          color: var(--foreground);
          border: 1px solid var(--border);
          padding: 0.5rem;
        }
        .pvtTable tbody tr td {
          color: var(--foreground);
          border: 1px solid var(--border);
          padding: 0.5rem;
        }
        .pvtTotal, .pvtGrandTotal {
          background-color: var(--accent);
          color: var(--accent-foreground);
          font-weight: bold;
        }
        .pvtRowTotalLabel, .pvtColTotalLabel {
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}