// src/components/maps/CampusMap.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { useAuth } from '@/context/auth-context';
import { getPOIsForAccount, savePOI } from '@/services/mapService';
import type { PointOfInterest } from '@/types/Map';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin, Plus, X, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Define the libraries we need
const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places"];

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
  const [isLoading, setIsLoading] = useState(true);
  
  // State for adding new POI
  const [newMarkerPosition, setNewMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [newPoiData, setNewPoiData] = useState({
    label: '',
    type: 'building' as PointOfInterest['type'],
    notes: '',
  });
  const [isAddingPoi, setIsAddingPoi] = useState(false);
  
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
      setIsLoading(true);
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
          setIsLoading(false);
        });
    }
  }, [userProfile?.account, authLoading, toast]);
  
  // Handle map click to add a new POI
  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (isAddingPoi && event.latLng) {
      setNewMarkerPosition({
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      });
    }
  }, [isAddingPoi]);
  
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
    });
  };
  
  // Toggle POI adding mode
  const toggleAddingPoi = () => {
    setIsAddingPoi((prev) => !prev);
    if (isAddingPoi) {
      handleCancelAddPoi();
    }
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
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Campus Map</h2>
          <p className="text-sm text-muted-foreground">
            {isAddingPoi 
              ? "Click on the map to place a new point of interest." 
              : "View and manage campus points of interest."}
          </p>
        </div>
        <Button 
          onClick={toggleAddingPoi} 
          variant={isAddingPoi ? "destructive" : "default"}
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
              icon={{
                url: `/map-icons/${poi.type}.svg`,
                scaledSize: new google.maps.Size(32, 32),
              }}
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
        </GoogleMap>
        
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
      
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
            <li>Fill in the details and click <strong>Save</strong> to add the point of interest.</li>
            <li>Click on existing markers to view their details.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}