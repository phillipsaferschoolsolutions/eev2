"use client";

import React, { useMemo, useState, useEffect } from 'react';
import type { PivotTableData } from '@/types/Analysis';
import { Skeleton } from '@/components/ui/skeleton';

interface VisualizationComponentProps {
  data: PivotTableData[];
  type: 'bar' | 'line' | 'pie';
  dimensions: string[];
  measures: string[];
}

export default function VisualizationComponent({ 
  data, 
  type, 
  dimensions, 
  measures 
}: VisualizationComponentProps) {
  const [isClient, setIsClient] = useState(false);
  const [ChartComponents, setChartComponents] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Dynamically import recharts components to avoid SSR issues
    const loadCharts = async () => {
      try {
        const {
          BarChart,
          Bar,
          LineChart,
          Line,
          PieChart,
          Pie,
          Cell,
          XAxis,
          YAxis,
          CartesianGrid,
          Tooltip,
          Legend,
          ResponsiveContainer,
        } = await import('recharts');
        
        setChartComponents({
          BarChart,
          Bar,
          LineChart,
          Line,
          PieChart,
          Pie,
          Cell,
          XAxis,
          YAxis,
          CartesianGrid,
          Tooltip,
          Legend,
          ResponsiveContainer,
        });
      } catch (error) {
        console.error('Failed to load chart components:', error);
      }
    };
    
    loadCharts();
  }, []);
  
  // Prepare data for visualization
  const chartData = useMemo(() => {
    if (!data.length) return [];
    
    // Group data by the first dimension
    const groupedData = data.reduce((acc, item: Record<string, unknown>) => {
      const dimensionKey = dimensions[0];
      const dimensionValue = item[dimensionKey] || 'Unknown';
      
      if (!acc[dimensionValue as string]) {
        acc[dimensionValue as string] = {
          name: item.questionLabel || item.locationName || dimensionValue,
        };
        
        // Initialize measures
        measures.forEach(measure => {
          acc[dimensionValue as string][measure] = 0;
        });
      }
      
      // Sum up measures
      measures.forEach(measure => {
        if (item[measure] !== undefined) {
          const currentValue = acc[dimensionValue as string][measure] as number;
          const newValue = Number(item[measure]);
          acc[dimensionValue as string][measure] = currentValue + newValue;
        }
      });
      
      return acc;
    }, {} as Record<string, Record<string, unknown>>);
    
    // Convert to array for Recharts
    return Object.values(groupedData);
  }, [data, dimensions, measures]);
  
  // Define colors for the charts
  const COLORS = [
    '#3B82F6', // blue-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
    '#F97316', // orange-500
    '#14B8A6', // teal-500
    '#6366F1', // indigo-500
  ];
  
  // If no data, show a message
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20 rounded-md">
        <p className="text-muted-foreground">No data available. Please adjust your filters and try again.</p>
      </div>
    );
  }
  
  // If no chart data could be prepared, show a message
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20 rounded-md">
        <p className="text-muted-foreground">Could not prepare chart data. Please check your dimension and measure selections.</p>
      </div>
    );
  }

  // If we're on the server or haven't loaded chart components yet, show a skeleton
  if (!isClient || !ChartComponents) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
  } = ChartComponents;
  
  // Render the appropriate chart based on the type
  return (
    <ResponsiveContainer width="100%" height="100%">
      {type === 'bar' ? (
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70} 
            tick={{ fontSize: 12 }}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          {measures.map((measure, index) => (
            <Bar 
              key={measure} 
              dataKey={measure} 
              fill={COLORS[index % COLORS.length]} 
              name={measure === 'count' ? 'Count' : 
                    measure === 'deficiencyCount' ? 'Deficiency Count' : 
                    measure === 'deficiencyRate' ? 'Deficiency Rate (%)' : 
                    measure}
            />
          ))}
        </BarChart>
      ) : type === 'line' ? (
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70} 
            tick={{ fontSize: 12 }}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          {measures.map((measure, index) => (
            <Line 
              key={measure} 
              type="monotone" 
              dataKey={measure} 
              stroke={COLORS[index % COLORS.length]}
              name={measure === 'count' ? 'Count' : 
                    measure === 'deficiencyCount' ? 'Deficiency Count' : 
                    measure === 'deficiencyRate' ? 'Deficiency Rate (%)' : 
                    measure}
            />
          ))}
        </LineChart>
      ) : (
        <PieChart>
          <Tooltip />
          <Legend />
          {measures.map((measure, measureIndex) => (
            <Pie
              key={measure}
              data={chartData}
              cx={`${50 + (measureIndex * 33)}%`}
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey={measure}
              nameKey="name"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          ))}
        </PieChart>
      )}
    </ResponsiveContainer>
  );
}