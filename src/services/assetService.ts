@@ .. @@
 import { auth, firestore } from '@/lib/firebase';
 import type { User } from 'firebase/auth';
-import type { Asset, CreateAssetPayload, UpdateAssetPayload } from '@/types/Asset';
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
 
+// Define Asset interfaces here since they're used by this service
+export interface Asset {
+  id: string;
+  name: string;
+  type: string;
+  serialNumber?: string;
+  model?: string;
+  manufacturer?: string;
+  purchaseDate?: string;
+  warrantyExpiry?: string;
+  condition: 'Good' | 'Needs Repair' | 'Retired' | 'Missing';
+  locationId?: string;
+  locationName?: string;
+  assignedToId?: string;
+  assignedToName?: string;
+  notes?: string;
+  photoUrl?: string;
+  accountId: string;
+  createdBy: string;
+  createdAt: any;
+  updatedAt: any;
+  purchasePrice?: number;
+  currentValue?: number;
+  maintenanceSchedule?: string;
+  lastMaintenanceDate?: string;
+}
+
+export interface CreateAssetPayload {
+  name: string;
+  type: string;
+  serialNumber?: string;
+  model?: string;
+  manufacturer?: string;
+  purchaseDate?: string;
+  warrantyExpiry?: string;
+  condition: Asset['condition'];
+  locationId?: string;
+  assignedToId?: string;
+  notes?: string;
+  purchasePrice?: number;
+}
+
+export interface UpdateAssetPayload {
+  name?: string;
+  type?: string;
+  serialNumber?: string;
+  model?: string;
+  manufacturer?: string;
+  purchaseDate?: string;
+  warrantyExpiry?: string;
+  condition?: Asset['condition'];
+  locationId?: string;
+  assignedToId?: string;
+  notes?: string;
+  purchasePrice?: number;
+  currentValue?: number;
+}