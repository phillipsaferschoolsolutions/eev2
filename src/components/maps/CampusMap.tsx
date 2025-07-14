// src/components/maps/CampusMap.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow, Polyline, DrawingManager } from '@react-google-maps/api';
import { useAuth } from '@/context/auth-context';
import { getPOIsForAccount, savePOI, getRoutesForAccount } from '@/services/mapService';
import type { PointOfInterest, RoutePoint, ReunificationRoute } from '@/types/Map';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin, Plus, X, Info, Route as RouteIcon, Layers, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import RouteEditor from '@/components/maps/RouteEditor';
import * as turf from '@turf/turf';

// Define the libraries we need
const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places", "drawing"];

// Map container style
const mapContainerStyle = {
  width: '100%',
  height: '70vh',
  borderRadius: '0.5rem',
};

// Default center (will be overridden by user's location or saved settings)
const defaultCenter = {
  lat: 37.7749, // San Francisco
  lng: -122.4194,
};

// Map options
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
};

// POI type options
const poiTypes = [
  { value: 'building', label: 'Building' },
  { value: 'entrance', label: 'Entrance' },
  { value: 'exit', label: 'Exit' },
  { value: 'parking', label: 'Parking' },
  { value: 'staging', label: 'Staging Area' },
  { value: 'custom', label: 'Custom' },
];

// Zone type options
const zoneTypes = [
  { value: 'none', label: 'None' },
  { value: 'safe', label: 'Safe Zone' },
  { value: 'restricted', label: 'Restricted Area' },
  { value: 'hazard', label: 'Hazard Zone' },
];

export default function CampusMap() {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const mapRef = useRef<google.maps.Map | null>(null);
  
  // State for Google Maps
  const [center, setCenter] = useState(defaultCenter);
  const [zoom, setZoom] = useState(15);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  
  // State for POIs
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
  const [isLoadingPois, setIsLoadingPois] = useState(true);
  
  // State for adding new POI
  const [newMarkerPosition, setNewMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [newPoiData, setNewPoiData] = useState({
    label: '',
    type: 'building' as PointOfInterest['type'],
    notes: '',
    zoneType: 'none' as 'safe' | 'restricted' | 'hazard' | 'none',
    isEmergencyPoint: false,
  });
  const [isAddingPoi, setIsAddingPoi] = useState(false);
  
  // State for routes
  const [routes, setRoutes] = useState<ReunificationRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<ReunificationRoute | null>(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  
  // State for route creation
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  
  // Load the Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });
  
  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(userPos);
          setCenter(userPos);
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    }
  }, []);
  
  // Load POIs when user profile is available
  useEffect(() => {
    if (!authLoading && userProfile?.account) {
      setIsLoadingPois(true);
      getPOIsForAccount(userProfile.account)
        .then((fetchedPois) => {
          setPois(fetchedPois);
        })
        .catch((error) => {
          console.error("Error fetching POIs:", error);
          toast({
            variant: "destructive",
            title: "Error Loading Map Data",
            description: "Could not load map points of interest.",
          });
        })
        .finally(() => {
          setIsLoadingPois(false);
        });
        
      // Load routes
      setIsLoadingRoutes(true);
      getRoutesForAccount(userProfile.account)
        .then((fetchedRoutes) => {
          setRoutes(fetchedRoutes);
        })
        .catch((error) => {
          console.error("Error fetching routes:", error);
          toast({
            variant: "destructive",
            title: "Error Loading Routes",
            description: "Could not load reunification routes.",
          });
        })
        .finally(() => {
          setIsLoadingRoutes(false);
        });
    }
  }, [userProfile?.account, authLoading, toast]);
  
  // Handle map click to add a new POI
  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (isAddingPoi && event.latLng) {
      // Adding a POI
      setNewMarkerPosition({
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      });
    } else if (isDrawingRoute && event.latLng) {
      // Adding a route point
      const newPoint: RoutePoint = {
        id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position: {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        },
        order: routePoints.length,
      };
      setRoutePoints((prev) => [...prev, newPoint]);
    }
  }, [isAddingPoi, isDrawingRoute, routePoints.length]);
  
  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);
  
  // Handle saving a new POI
  const handleSavePoi = async () => {
    if (!newMarkerPosition || !userProfile?.account) return;
    
    try {
      const newPoi: Omit<PointOfInterest, 'id' | 'createdAt'> = {
        lat: newMarkerPosition.lat,
        lng: newMarkerPosition.lng,
        name: newPoiData.label,
        label: newPoiData.label,
        type: newPoiData.type,
        notes: newPoiData.notes,
        zoneType: newPoiData.zoneType,
        isEmergencyPoint: newPoiData.isEmergencyPoint,
        accountId: userProfile.account,
        createdBy: userProfile.email,
      };
      
      const poiId = await savePOI(newPoi);
      
      // Add the new POI to the state
      setPois((prev) => [...prev, { ...newPoi, id: poiId } as PointOfInterest]);
      
      // Reset the form
      setNewMarkerPosition(null);
      setNewPoiData({
        label: '',
        type: 'building',
        notes: '',
        zoneType: 'none',
        isEmergencyPoint: false,
      });
      
      toast({
        title: "POI Saved",
        description: `"${newPoiData.label}" has been added to the map.`,
      });
    } catch (error) {
      console.error("Error saving POI:", error);
      toast({
        variant: "destructive",
        title: "Error Saving POI",
        description: "Could not save the point of interest.",
      });
    }
  };
  
  // Cancel adding a new POI
  const handleCancelAddPoi = () => {
    setNewMarkerPosition(null);
    setNewPoiData({
      label: '',
      type: 'building',
      notes: '', 
      zoneType: 'none',
      isEmergencyPoint: false,
    });
  };
  
  // Toggle POI adding mode
  const toggleAddingPoi = () => {
    setIsAddingPoi((prev) => !prev);
    if (isAddingPoi) {
      handleCancelAddPoi();
    }
    setIsDrawingRoute(false);
  };
  
  // Toggle route drawing mode
  const toggleDrawingRoute = () => {
    setIsDrawingRoute((prev) => !prev);
    if (isDrawingRoute) {
      // Cancel route drawing
      setRoutePoints([]);
    }
    setIsAddingPoi(false);
    setNewMarkerPosition(null);
  };
  
  // Start creating a route from the drawn points
  const startRouteCreation = () => {
    if (routePoints.length < 2) {
      toast({
        variant: "destructive",
        title: "Insufficient Points",
        description: "A route must have at least 2 points.",
      });
      return;
    }
    
    setIsCreatingRoute(true);
  };
  
  // Handle route save completion
  const handleRouteSaved = (routeId: string) => {
    setIsCreatingRoute(false);
    setIsDrawingRoute(false);
    setRoutePoints([]);
    
    // Refresh routes
    if (userProfile?.account) {
      setIsLoadingRoutes(true);
      getRoutesForAccount(userProfile.account)
        .then((fetchedRoutes) => {
          setRoutes(fetchedRoutes);
        })
        .catch((error) => {
          console.error("Error fetching routes:", error);
        })
        .finally(() => {
          setIsLoadingRoutes(false);
        });
    }
  };
  
  // Cancel route creation
  const cancelRouteCreation = () => {
    setIsCreatingRoute(false);
    setRoutePoints([]);
    setIsDrawingRoute(false);
  };
  
  // Render loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[70vh] bg-muted/20 rounded-lg border">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Loading Map...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[70vh] bg-destructive/10 rounded-lg border border-destructive/20">
        <div className="text-center max-w-md p-4">
          <p className="text-lg font-medium text-destructive mb-2">Error Loading Google Maps</p>
          <p className="text-sm text-muted-foreground">
            {loadError.message || "Could not load Google Maps. Please check your API key and try again."}
          </p>
        </div>
      </div>
    );
  }
  
  // Get POI icon based on type and properties
  const getPoiIcon = (poi: PointOfInterest) => {
    // Base icon URL
    let iconUrl = `/map-icons/${poi.type}.svg`;
    
    // Scale based on importance
    const scale = poi.isEmergencyPoint ? 40 : 32;
    
    // Return the icon configuration
    return {
      url: iconUrl,
      scaledSize: new google.maps.Size(scale, scale),
    };
  };
  
  // Get zone style based on zone type
  const getZoneStyle = (zoneType: string) => {
    switch (zoneType) {
      case 'safe':
        return {
          fillColor: '#10B981', // Green
          fillOpacity: 0.2,
          strokeColor: '#10B981',
          strokeWeight: 2,
        };
      case 'restricted':
        return {
          fillColor: '#F59E0B', // Amber
          fillOpacity: 0.2,
          strokeColor: '#F59E0B',
          strokeWeight: 2,
        };
      case 'hazard':
        return {
          fillColor: '#EF4444', // Red
          fillOpacity: 0.2,
          strokeColor: '#EF4444',
          strokeWeight: 2,
        };
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-xl font-semibold">Campus Map</h2>
          <p className="text-sm text-muted-foreground">
            {isAddingPoi ? "Click on the map to place a new point of interest." : 
             isDrawingRoute ? "Click on the map to add route points." :
             "View and manage campus points of interest and routes."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => setShowRoutes(!showRoutes)} 
            variant="outline"
            className="flex items-center gap-2"
          >
            {showRoutes ? (
              <>
                <EyeOff className="h-4 w-4" /> Hide Routes
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" /> Show Routes
              </>
            )}
          </Button>
          
          <Button 
            onClick={toggleDrawingRoute} 
            variant={isDrawingRoute ? "destructive" : "secondary"}
            disabled={isAddingPoi || isCreatingRoute}
          >
            {isDrawingRoute ? (
              <>
                <X className="mr-2 h-4 w-4" /> Cancel Route
              </>
            ) : (
              <>
                <RouteIcon className="mr-2 h-4 w-4" /> Draw Route
              </>
            )}
          </Button>
          
          <Button 
            onClick={toggleAddingPoi} 
            variant={isAddingPoi ? "destructive" : "default"}
            disabled={isDrawingRoute || isCreatingRoute}
          >
            {isAddingPoi ? (
              <>
                <X className="mr-2 h-4 w-4" /> Cancel
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" /> Add POI
              </>
            )}
          </Button>
        </div>
      </div>
      
      {isCreatingRoute ? (
        <RouteEditor
          accountId={userProfile?.account || ''}
          userEmail={userProfile?.email || ''}
          points={routePoints}
          onSave={handleRouteSaved}
          onCancel={cancelRouteCreation}
        />
      ) : (
        <div className="relative">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={zoom}
            options={mapOptions}
            onClick={handleMapClick}
            onLoad={onMapLoad}
          >
            {/* User's location marker */}
            {userLocation && (
              <Marker
                position={userLocation}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 7,
                  fillColor: "#4285F4",
                  fillOpacity: 1,
                  strokeColor: "#FFFFFF",
                  strokeWeight: 2,
                }}
                title="Your Location"
              />
            )}
            
            {/* Existing POIs */}
            {pois.map((poi) => (
              <Marker
                key={poi.id}
                position={{ lat: poi.lat, lng: poi.lng }}
                onClick={() => setSelectedPoi(poi)}
                icon={getPoiIcon(poi)}
              />
            ))}
            
            {/* Selected POI Info Window */}
            {selectedPoi && (
              <InfoWindow
                position={{ lat: selectedPoi.lat, lng: selectedPoi.lng }}
                onCloseClick={() => setSelectedPoi(null)}
              >
                <div className="p-2 max-w-xs">
                  <h3 className="font-semibold text-black">{selectedPoi.label}</h3>
                  <p className="text-xs text-gray-600 mb-1">Type: {selectedPoi.type}</p>
                  {selectedPoi.zoneType && selectedPoi.zoneType !== 'none' && (
                    <p className="text-xs text-gray-600 mb-1">Zone: {selectedPoi.zoneType}</p>
                  )}
                  {selectedPoi.isEmergencyPoint && (
                    <p className="text-xs font-semibold text-red-600 mb-1">Emergency Point</p>
                  )}
                  {selectedPoi.notes && (
                    <p className="text-sm text-gray-800 mt-1">{selectedPoi.notes}</p>
                  )}
                </div>
              </InfoWindow>
            )}
            
            {/* New POI Marker */}
            {newMarkerPosition && (
              <Marker
                position={newMarkerPosition}
                animation={google.maps.Animation.DROP}
              />
            )}
            
            {/* New POI Form */}
            {newMarkerPosition && (
              <InfoWindow
                position={newMarkerPosition}
                onCloseClick={handleCancelAddPoi}
              >
                <div className="p-2 max-w-xs">
                  <h3 className="font-semibold text-black mb-2">Add New Point of Interest</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="poi-label" className="text-black">Label</Label>
                      <Input
                        id="poi-label"
                        value={newPoiData.label}
                        onChange={(e) => setNewPoiData({ ...newPoiData, label: e.target.value })}
                        placeholder="e.g., Main Entrance"
                        className="text-black"
                      />
                    </div>
                    <div>
                      <Label htmlFor="poi-type" className="text-black">Type</Label>
                      <Select
                        value={newPoiData.type}
                        onValueChange={(value) => setNewPoiData({ ...newPoiData, type: value as PointOfInterest['type'] })}
                      >
                        <SelectTrigger id="poi-type" className="text-black">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {poiTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="poi-zone-type" className="text-black">Zone Type</Label>
                      <Select
                        value={newPoiData.zoneType}
                        onValueChange={(value) => setNewPoiData({ ...newPoiData, zoneType: value as 'safe' | 'restricted' | 'hazard' | 'none' })}
                      >
                        <SelectTrigger id="poi-zone-type" className="text-black">
                          <SelectValue placeholder="Select zone type" />
                        </SelectTrigger>
                        <SelectContent>
                          {zoneTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="poi-emergency"
                        checked={newPoiData.isEmergencyPoint}
                        onChange={(e) => setNewPoiData({ ...newPoiData, isEmergencyPoint: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="poi-emergency" className="text-black font-normal">
                        Mark as Emergency Point
                      </Label>
                    </div>
                    <div>
                      <Label htmlFor="poi-notes" className="text-black">Notes (Optional)</Label>
                      <Textarea
                        id="poi-notes"
                        value={newPoiData.notes}
                        onChange={(e) => setNewPoiData({ ...newPoiData, notes: e.target.value })}
                        placeholder="Additional details..."
                        className="text-black"
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelAddPoi}
                        className="text-black"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSavePoi}
                        disabled={!newPoiData.label}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </InfoWindow>
            )}
            
            {/* Route Drawing Points */}
            {isDrawingRoute && routePoints.map((point, index) => (
              <Marker
                key={point.id}
                position={point.position}
                label={{
                  text: (index + 1).toString(),
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
            ))}
            
            {/* Route Drawing Lines */}
            {isDrawingRoute && routePoints.length > 1 && (
              <Polyline
                path={routePoints.map(point => point.position)}
                options={{
                  strokeColor: '#3B82F6',
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                }}
              />
            )}
            
            {/* Existing Routes */}
            {showRoutes && routes.map((route) => (
              <Polyline
                key={route.id}
                path={route.points.map(point => point.position)}
                options={{
                  strokeColor: route.color || '#3B82F6',
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                  icons: [
                    {
                      icon: {
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        scale: 3,
                      },
                      offset: '100%',
                    },
                  ],
                }}
                onClick={() => setSelectedRoute(route)}
              />
            ))}
            
            {/* Selected Route Info Window */}
            {selectedRoute && (
              <InfoWindow
                position={selectedRoute.points[0].position}
                onCloseClick={() => setSelectedRoute(null)}
              >
                <div className="p-2 max-w-xs">
                  <h3 className="font-semibold text-black">{selectedRoute.name}</h3>
                  <p className="text-xs text-gray-600 mb-1">Type: {selectedRoute.type}</p>
                  {selectedRoute.description && (
                    <p className="text-sm text-gray-800 mt-1">{selectedRoute.description}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-2">{selectedRoute.points.length} points</p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
          
          {(isLoadingPois || isLoadingRoutes) && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {/* Route Drawing Controls */}
          {isDrawingRoute && routePoints.length > 0 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg shadow-lg p-4 flex gap-2">
              <Button variant="outline" onClick={() => setRoutePoints([])}>
                Clear Points
              </Button>
              <Button onClick={startRouteCreation} disabled={routePoints.length < 2}>
                Create Route
              </Button>
            </div>
          )}
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" /> Map Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Click the <strong>Add POI</strong> button to start adding points of interest.</li>
            <li>Click anywhere on the map to place a marker.</li>
            <li>Click the <strong>Draw Route</strong> button to create evacuation or reunification routes.</li>
            <li>Use the <strong>Show/Hide Routes</strong> toggle to control route visibility.</li>
            <li>Click on existing POIs or routes to view their details.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}