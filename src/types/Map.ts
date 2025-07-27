// src/types/Map.ts

export interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  accountId: string;
  createdBy: string;
  createdAt: unknown; // Firestore Timestamp
}

export interface PointOfInterest extends MapLocation {
  type: 'building' | 'entrance' | 'exit' | 'parking' | 'staging' | 'custom';
  label: string;
  notes?: string; 
  color?: string;
  icon?: string;
  zoneType?: 'safe' | 'restricted' | 'hazard' | 'none';
  isEmergencyPoint?: boolean;
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
  updatedAt: unknown; // Firestore Timestamp
  updatedBy: string;
}

export interface RoutePoint {
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  order: number;
  label?: string;
  notes?: string;
}

export interface ReunificationRoute {
  id: string;
  name: string;
  description?: string;
  accountId: string;
  createdBy: string;
  createdAt: unknown; // Firestore Timestamp
  updatedAt?: unknown; // Firestore Timestamp
  updatedBy?: string;
  points: RoutePoint[];
  color?: string;
  isActive?: boolean;
  visibleTo?: string[]; // Array of role IDs
  type: 'student' | 'guardian' | 'emergency' | 'evacuation';
}