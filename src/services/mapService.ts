// src/services/mapService.ts
'use client';

import { auth, firestore } from '@/lib/firebase';
import type { PointOfInterest, MapSettings, ReunificationRoute } from '@/types/Map';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';


/**
 * Saves a new Point of Interest to Firestore
 */
export async function savePOI(poi: Omit<PointOfInterest, 'id' | 'createdAt'>): Promise<string> {
  try {
    const poiCollection = collection(firestore, 'campus_pois');
    const docRef = await addDoc(poiCollection, {
      ...poi,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving POI:", error);
    throw new Error(`Failed to save POI: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Updates an existing Point of Interest
 */
export async function updatePOI(poiId: string, updates: Partial<PointOfInterest>): Promise<void> {
  try {
    const poiRef = doc(firestore, 'campus_pois', poiId);
    await updateDoc(poiRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating POI:", error);
    throw new Error(`Failed to update POI: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Deletes a Point of Interest
 */
export async function deletePOI(poiId: string): Promise<void> {
  try {
    const poiRef = doc(firestore, 'campus_pois', poiId);
    await deleteDoc(poiRef);
  } catch (error) {
    console.error("Error deleting POI:", error);
    throw new Error(`Failed to delete POI: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets all Points of Interest for an account
 */
export async function getPOIsForAccount(accountId: string): Promise<PointOfInterest[]> {
  try {
    const poiCollection = collection(firestore, 'campus_pois');
    const q = query(poiCollection, where('accountId', '==', accountId));
    const querySnapshot = await getDocs(q);
    
    const pois: PointOfInterest[] = [];
    querySnapshot.forEach((doc) => {
      pois.push({
        id: doc.id,
        ...doc.data(),
      } as PointOfInterest);
    });
    
    return pois;
  } catch (error) {
    console.error("Error getting POIs:", error);
    throw new Error(`Failed to get POIs: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets map settings for an account or creates default settings if none exist
 */
export async function getMapSettings(accountId: string): Promise<MapSettings> {
  try {
    // Try to get existing settings
    const settingsRef = doc(firestore, 'map_settings', accountId);
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      return {
        id: settingsDoc.id,
        ...settingsDoc.data(),
      } as MapSettings;
    }
    
    // Create default settings if none exist
    const defaultSettings: Omit<MapSettings, 'id'> = {
      accountId,
      defaultLocation: {
        lat: 37.7749, // Default to San Francisco
        lng: -122.4194,
      },
      defaultZoom: 15,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || 'system',
    };
    
    // Save default settings
    await updateDoc(settingsRef, defaultSettings);
    
    return {
      id: accountId,
      ...defaultSettings,
    } as MapSettings;
  } catch (error) {
    console.error("Error getting map settings:", error);
    throw new Error(`Failed to get map settings: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Updates map settings for an account
 */
export async function updateMapSettings(accountId: string, updates: Partial<MapSettings>): Promise<void> {
  try {
    const settingsRef = doc(firestore, 'map_settings', accountId);
    await updateDoc(settingsRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || 'system',
    });
  } catch (error) {
    console.error("Error updating map settings:", error);
    throw new Error(`Failed to update map settings: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Saves a new reunification route
 */
export async function saveRoute(route: Omit<ReunificationRoute, 'id' | 'createdAt'>): Promise<string> {
  try {
    const routeCollection = collection(firestore, 'reunification_routes');
    const docRef = await addDoc(routeCollection, {
      ...route,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving route:", error);
    throw new Error(`Failed to save route: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Updates an existing reunification route
 */
export async function updateRoute(routeId: string, updates: Partial<ReunificationRoute>): Promise<void> {
  try {
    const routeRef = doc(firestore, 'reunification_routes', routeId);
    await updateDoc(routeRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || 'system',
    });
  } catch (error) {
    console.error("Error updating route:", error);
    throw new Error(`Failed to update route: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Deletes a reunification route
 */
export async function deleteRoute(routeId: string): Promise<void> {
  try {
    const routeRef = doc(firestore, 'reunification_routes', routeId);
    await deleteDoc(routeRef);
  } catch (error) {
    console.error("Error deleting route:", error);
    throw new Error(`Failed to delete route: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets all reunification routes for an account
 */
export async function getRoutesForAccount(accountId: string): Promise<ReunificationRoute[]> {
  try {
    const routeCollection = collection(firestore, 'reunification_routes');
    const q = query(routeCollection, where('accountId', '==', accountId));
    const querySnapshot = await getDocs(q);
    
    const routes: ReunificationRoute[] = [];
    querySnapshot.forEach((doc) => {
      routes.push({
        id: doc.id,
        ...doc.data(),
      } as ReunificationRoute);
    });
    
    return routes;
  } catch (error) {
    console.error("Error getting routes:", error);
    throw new Error(`Failed to get routes: ${error instanceof Error ? error.message : String(error)}`);
  }
}