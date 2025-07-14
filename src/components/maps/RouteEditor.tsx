// src/components/maps/RouteEditor.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { saveRoute } from '@/services/mapService';
import type { RoutePoint, ReunificationRoute } from '@/types/Map';
import { MapPin, Save, X, ArrowUpDown, Trash2 } from 'lucide-react';

interface RouteEditorProps {
  accountId: string;
  userEmail: string;
  points: RoutePoint[];
  onSave: (routeId: string) => void;
  onCancel: () => void;
}

export default function RouteEditor({ accountId, userEmail, points, onSave, onCancel }: RouteEditorProps) {
  const { toast } = useToast();
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [routeType, setRouteType] = useState<ReunificationRoute['type']>('evacuation');
  const [routeColor, setRouteColor] = useState('#3B82F6'); // Default blue
  const [isSaving, setIsSaving] = useState(false);
  const [orderedPoints, setOrderedPoints] = useState<RoutePoint[]>(points);
  
  // Handle saving the route
  const handleSaveRoute = async () => {
    if (!routeName.trim()) {
      toast({
        variant: "destructive",
        title: "Route Name Required",
        description: "Please provide a name for this route.",
      });
      return;
    }
    
    if (orderedPoints.length < 2) {
      toast({
        variant: "destructive",
        title: "Insufficient Points",
        description: "A route must have at least 2 points.",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const newRoute: Omit<ReunificationRoute, 'id' | 'createdAt'> = {
        name: routeName,
        description: routeDescription,
        accountId,
        createdBy: userEmail,
        points: orderedPoints,
        color: routeColor,
        isActive: true,
        type: routeType,
        visibleTo: ['admin', 'teacher'], // Default visibility
      };
      
      const routeId = await saveRoute(newRoute);
      
      toast({
        title: "Route Saved",
        description: `"${routeName}" has been saved successfully.`,
      });
      
      onSave(routeId);
    } catch (error) {
      console.error("Error saving route:", error);
      toast({
        variant: "destructive",
        title: "Error Saving Route",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Move a point up in the order
  const movePointUp = (index: number) => {
    if (index <= 0) return;
    const newPoints = [...orderedPoints];
    [newPoints[index], newPoints[index - 1]] = [newPoints[index - 1], newPoints[index]];
    // Update order property
    newPoints.forEach((point, idx) => {
      point.order = idx;
    });
    setOrderedPoints(newPoints);
  };
  
  // Move a point down in the order
  const movePointDown = (index: number) => {
    if (index >= orderedPoints.length - 1) return;
    const newPoints = [...orderedPoints];
    [newPoints[index], newPoints[index + 1]] = [newPoints[index + 1], newPoints[index]];
    // Update order property
    newPoints.forEach((point, idx) => {
      point.order = idx;
    });
    setOrderedPoints(newPoints);
  };
  
  // Remove a point from the route
  const removePoint = (index: number) => {
    const newPoints = orderedPoints.filter((_, idx) => idx !== index);
    // Update order property
    newPoints.forEach((point, idx) => {
      point.order = idx;
    });
    setOrderedPoints(newPoints);
  };
  
  // Update point label
  const updatePointLabel = (index: number, label: string) => {
    const newPoints = [...orderedPoints];
    newPoints[index] = { ...newPoints[index], label };
    setOrderedPoints(newPoints);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Reunification Route</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="route-name">Route Name</Label>
          <Input
            id="route-name"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            placeholder="e.g., Main Building Evacuation"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="route-description">Description (Optional)</Label>
          <Textarea
            id="route-description"
            value={routeDescription}
            onChange={(e) => setRouteDescription(e.target.value)}
            placeholder="Provide details about this route..."
            rows={3}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="route-type">Route Type</Label>
            <Select value={routeType} onValueChange={(value) => setRouteType(value as ReunificationRoute['type'])}>
              <SelectTrigger id="route-type">
                <SelectValue placeholder="Select route type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evacuation">Evacuation</SelectItem>
                <SelectItem value="student">Student Reunification</SelectItem>
                <SelectItem value="guardian">Guardian Check-in</SelectItem>
                <SelectItem value="emergency">Emergency Response</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="route-color">Route Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="route-color"
                type="color"
                value={routeColor}
                onChange={(e) => setRouteColor(e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                value={routeColor}
                onChange={(e) => setRouteColor(e.target.value)}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Route Points ({orderedPoints.length})</Label>
            <Badge variant={orderedPoints.length < 2 ? "destructive" : "default"}>
              {orderedPoints.length < 2 ? "Need at least 2 points" : `${orderedPoints.length} points`}
            </Badge>
          </div>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-2">
            {orderedPoints.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No points added yet.</p>
                <p className="text-sm">Click on the map to add points to your route.</p>
              </div>
            ) : (
              orderedPoints.map((point, index) => (
                <div key={point.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <Input
                    value={point.label || ''}
                    onChange={(e) => updatePointLabel(index, e.target.value)}
                    placeholder={`Point ${index + 1}`}
                    className="flex-1"
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => movePointUp(index)}
                      disabled={index === 0}
                      title="Move Up"
                    >
                      <ArrowUpDown className="h-4 w-4 rotate-180" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => movePointDown(index)}
                      disabled={index === orderedPoints.length - 1}
                      title="Move Down"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePoint(index)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Remove Point"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button onClick={handleSaveRoute} disabled={isSaving || orderedPoints.length < 2 || !routeName.trim()}>
          {isSaving ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin">⏳</span> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Route
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}