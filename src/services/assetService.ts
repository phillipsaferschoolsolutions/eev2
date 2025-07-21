
 import { auth, firestore } from '@/lib/firebase';
 import type { User } from 'firebase/auth';
import type { Asset, CreateAssetPayload, UpdateAssetPayload } from '@/types/Asset';
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
   orderBy,
   serverTimestamp,
 } from 'firebase/firestore';

// --- Helper to get ID Token ---
async function getIdToken(): Promise<string | null> {
  const currentUser: User | null = auth.currentUser;
  if (currentUser) {
    try {
      return await currentUser.getIdToken();
    } catch (error) {
      console.error("Error getting ID token:", error);
      return null;
    }
  }
  return null;
}

// --- Generic Fetch Wrapper ---
async function authedFetch<T>(
  fullUrl: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn(`[CRITICAL] authedFetch (assetService): No Authorization token available for endpoint: ${fullUrl}.`);
  }

  // Automatically get accountName from localStorage
  const accountName = localStorage.getItem('accountName');
  if (accountName) {
    headers.set('account', accountName);
  } else {
    console.warn(`[CRITICAL] authedFetch (assetService): 'account' header not found in localStorage for URL: ${fullUrl}.`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(fullUrl, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.text();
    console.error(`API Error ${response.status} for ${fullUrl}:`, errorData);
    throw new Error(`API Error: ${response.status} ${errorData || response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as any as T;
  }
  
  const textResponse = await response.text();
  try {
    return JSON.parse(textResponse);
  } catch (e) {
    return textResponse as any as T;
  }
}

const ASSETS_BASE_URL = 'https://us-central1-webmvp-5b733.cloudfunctions.net/assets';

/**
 * Fetches all assets for a given account.
 * @param account The account ID to filter assets by.
 */
export async function getAssets(account: string): Promise<Asset[]> {
  try {
    const assetsCollection = collection(firestore, 'assets');
    const q = query(
      assetsCollection,
      where('accountId', '==', account),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);

    const assets: Asset[] = [];
    querySnapshot.forEach((doc) => {
      assets.push({
        id: doc.id,
        ...doc.data(),
      } as Asset);
    });
    return assets;
  } catch (error) {
    console.error("Error fetching assets:", error);
    throw new Error(`Failed to fetch assets: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Creates a new asset.
 * @param assetData The asset data to create.
 */
export async function createAsset(assetData: CreateAssetPayload & { account: string }): Promise<Asset> {
  try {
    const assetsCollection = collection(firestore, 'assets');
    const newAsset = {
      ...assetData,
      accountId: assetData.account,
      createdBy: auth.currentUser?.email || 'unknown',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Remove the account field since we're using accountId
    const { account, ...assetToSave } = newAsset;
    
    const docRef = await addDoc(assetsCollection, assetToSave);
    
    return {
      id: docRef.id,
      ...assetToSave,
    } as Asset;
  } catch (error) {
    console.error("Error creating asset:", error);
    throw new Error(`Failed to create asset: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Updates an existing asset.
 * @param assetId The ID of the asset to update.
 * @param updates The updates to apply to the asset.
 */
export async function updateAsset(assetId: string, updates: UpdateAssetPayload): Promise<void> {
  try {
    const assetRef = doc(firestore, 'assets', assetId);
    await updateDoc(assetRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating asset:", error);
    throw new Error(`Failed to update asset: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Deletes an asset.
 * @param assetId The ID of the asset to delete.
 */
export async function deleteAsset(assetId: string): Promise<void> {
  try {
    const assetRef = doc(firestore, 'assets', assetId);
    await deleteDoc(assetRef);
  } catch (error) {
    console.error("Error deleting asset:", error);
    throw new Error(`Failed to delete asset: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetches a single asset by its ID.
 * @param assetId The ID of the asset to fetch.
 */
export async function getAssetById(assetId: string): Promise<Asset | null> {
  try {
    const assetRef = doc(firestore, 'assets', assetId);
    const assetDoc = await getDoc(assetRef);
    
    if (assetDoc.exists()) {
      return {
        id: assetDoc.id,
        ...assetDoc.data(),
      } as Asset;
    }
    return null;
  } catch (error) {
    console.error("Error fetching asset by ID:", error);
    throw new Error(`Failed to fetch asset: ${error instanceof Error ? error.message : String(error)}`);
  }
}
 