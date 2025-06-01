
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react'; // Added useCallback
import { type User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/types/User'; 
import { getUserProfile } from '@/services/userService'; 

interface CustomClaims {
  admin?: boolean;
  superAdmin?: boolean;
  [key: string]: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  customClaims: CustomClaims | null; 
  loading: boolean; 
  profileLoading: boolean; 
  claimsLoading: boolean; 
  updateCurrentAccountInProfile: (newAccount: string) => void; // New function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [customClaims, setCustomClaims] = useState<CustomClaims | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false); 

      if (currentUser) {
        // Fetch Profile
        setProfileLoading(true);
        try {
          if (currentUser.email) {
            const profile = await getUserProfile(currentUser.email);
            console.log("[TEMP DEBUG AuthProvider] Fetched profile from userService:", JSON.stringify(profile, null, 2)); 
            setUserProfile(profile);
          } else {
            console.warn("[TEMP DEBUG AuthProvider] No currentUser.email to fetch profile.");
            setUserProfile(null);
          }
        } catch (error) {
          console.error("Failed to load user profile in AuthContext", error);
          setUserProfile(null);
        } finally {
          setProfileLoading(false);
        }

        // Fetch Custom Claims
        setClaimsLoading(true);
        try {
          const idTokenResult = await currentUser.getIdTokenResult(true); 
          setCustomClaims(idTokenResult.claims as CustomClaims);
        } catch (error) {
          console.error("Failed to load user custom claims in AuthContext", error);
          setCustomClaims(null);
        } finally {
          setClaimsLoading(false);
        }
      } else {
        setUserProfile(null);
        setCustomClaims(null);
        setProfileLoading(false);
        setClaimsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateCurrentAccountInProfile = useCallback((newAccount: string) => {
    setUserProfile(prevProfile => {
      if (prevProfile) {
        return { ...prevProfile, account: newAccount };
      }
      return null;
    });
    // Note: The original snippet updated localStorage.
    // This context currently re-fetches profile on auth change/reload.
    // If localStorage persistence for userProfile is desired between reloads and before Firebase syncs,
    // that logic would be added here. For now, the page reload after account switch will trigger a fresh profile fetch.
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, customClaims, loading, profileLoading, claimsLoading, updateCurrentAccountInProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
