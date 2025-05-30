
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { type User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/types/User'; // Import UserProfile
import { getUserProfile } from '@/services/userService'; // Import userService

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null; // Add userProfile
  loading: boolean; // Overall loading (auth state)
  profileLoading: boolean; // Specific loading for profile
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // State for UserProfile
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true); // State for profile loading
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Auth state determined

      if (currentUser && currentUser.email) {
        setProfileLoading(true); // Start profile loading
        try {
          const profile = await getUserProfile(currentUser.email); // Use email as ID
          setUserProfile(profile);
        } catch (error) {
          console.error("Failed to load user profile in AuthContext", error);
          setUserProfile(null); // Reset profile on error
        } finally {
          setProfileLoading(false); // Profile loading finished
        }
      } else {
        setUserProfile(null); // No user, so no profile
        setProfileLoading(false); // Not loading profile if no user
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, profileLoading }}>
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
