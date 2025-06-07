
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  updateCurrentAccountInProfile: (newAccount: string) => void;
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
            console.log("[AuthContext] Fetched profile:", profile); 
            setUserProfile(profile);
            // *** FIX: Save accountName to localStorage ***
            if (profile && profile.account) {
              localStorage.setItem('accountName', profile.account);
            } else {
              // Handle case where profile or account is missing
              localStorage.removeItem('accountName');
            }
          } else {
            console.warn("[AuthContext] No currentUser.email to fetch profile.");
            setUserProfile(null);
            localStorage.removeItem('accountName');
          }
        } catch (error) {
          console.error("Failed to load user profile in AuthContext", error);
          setUserProfile(null);
          localStorage.removeItem('accountName');
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
        // *** FIX: Clear user data and localStorage on logout ***
        setUserProfile(null);
        setCustomClaims(null);
        setProfileLoading(false);
        setClaimsLoading(false);
        localStorage.removeItem('accountName');
        localStorage.removeItem('user'); // Also clear user if stored
      }
    });

    return () => unsubscribe();
  }, []);

  const updateCurrentAccountInProfile = useCallback((newAccount: string) => {
    setUserProfile(prevProfile => {
      if (prevProfile) {
        const updatedProfile = { ...prevProfile, account: newAccount };
        // *** FIX: Update localStorage when account is changed ***
        localStorage.setItem('accountName', newAccount);
        return updatedProfile;
      }
      return null;
    });
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
