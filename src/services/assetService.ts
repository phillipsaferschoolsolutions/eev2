@@ .. @@
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
 