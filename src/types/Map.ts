// src/types/Map.ts

export interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  accountId: string;
  createdBy: string;
  createdAt: any; // Firestore Timestamp
}

export interface PointOfInterest extends MapLocation {
  type: 'building' | 'entrance' | 'exit' | 'parking' | 'staging' | 'custom';
  label: string;
  notes?: string;
  color?: string;
  icon?: string;
}

export interface MapViewport {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
}

export interface MapSettings {
  id: string;
  accountId: string;
  defaultLocation?: {
    lat: number;
    lng: number;
  };
  defaultZoom?: number;
  lastViewport?: MapViewport;
  updatedAt: any; // Firestore Timestamp
  updatedBy: string;
}