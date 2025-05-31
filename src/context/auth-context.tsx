
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { type User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/types/User'; // Import UserProfile
import { getUserProfile } from '@/services/userService'; // Import userService

interface CustomClaims {
  admin?: boolean;
  superAdmin?: boolean;
  // Add other custom claims as needed
  [key: string]: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  customClaims: CustomClaims | null; // Add customClaims
  loading: boolean; // Overall loading (auth state)
  profileLoading: boolean; // Specific loading for profile
  claimsLoading: boolean; // Specific loading for claims
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
      setLoading(false); // Auth state determined

      if (currentUser) {
        // Fetch Profile
        setProfileLoading(true);
        try {
          if (currentUser.email) {
            const profile = await getUserProfile(currentUser.email);
            setUserProfile(profile);
          } else {
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
          const idTokenResult = await currentUser.getIdTokenResult(true); // Force refresh to get latest claims
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

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, customClaims, loading, profileLoading, claimsLoading }}>
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
