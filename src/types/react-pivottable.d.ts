declare module 'react-pivottable/PivotTableUI' {
  import React from 'react';

  interface PivotTableUIProps {
    data: any[];
    onChange?: (state: any) => void;
    rows?: string[];
    cols?: string[];
    aggregatorName?: string;
    vals?: string[];
    rendererName?: string;
    sorters?: Record<string, any>;
    tableOptions?: {
      clickCallback?: (e: any, value: any, filters: any, pivotData: any) => void;
    };
    [key: string]: any;
  }

  const PivotTableUI: React.ComponentType<PivotTableUIProps>;
  export default PivotTableUI;
}

declare module 'react-pivottable/pivottable.css' {
  const content: any;
  export default content;
} 