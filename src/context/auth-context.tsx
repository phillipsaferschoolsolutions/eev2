
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { type User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, browserLocalPersistence } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import type { UserProfile, UserProfileWithRole } from '@/types/User'; 
import { getUserProfile } from '@/services/userService'; 
import { getRole } from '@/services/roleService';
import type { Role } from '@/types/Role';

interface CustomClaims {
  admin?: boolean;
  superAdmin?: boolean;
  [key: string]: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfileWithRole | null;
  customClaims: CustomClaims | null; 
  loading: boolean; 
  profileLoading: boolean; 
  claimsLoading: boolean; 
  roleLoading: boolean;
  updateCurrentAccountInProfile: (newAccount: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileWithRole | null>(null);
  const [customClaims, setCustomClaims] = useState<CustomClaims | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Set Firebase persistence within the component lifecycle
    auth.setPersistence(browserLocalPersistence).catch(error => 
      console.error('Failed to set Firebase persistence:', error)
    );

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
            
            // Create a copy of the profile to avoid modifying the original
            const profileWithRole: UserProfileWithRole = { ...profile };
            
            // Fetch role details if a role is specified
            if (profile && profile.role) {
              setRoleLoading(true);
              try {
                const roleDetails = await getRole(profile.role);
                if (roleDetails) {
                  profileWithRole.roleDetails = roleDetails;
                  profileWithRole.permissions = roleDetails.permissions;
                }
              } catch (roleError) {
                console.error("Failed to load role details in AuthContext", roleError);
              } finally {
                setRoleLoading(false);
              }
            } else {
              // For backward compatibility, if profile.permission exists but profile.role doesn't
              if (profile && profile.permission && !profile.role) {
                profileWithRole.role = profile.permission;
                
                // Try to fetch the role details using the permission value
                setRoleLoading(true);
                try {
                  const roleDetails = await getRole(profile.permission);
                  if (roleDetails) {
                    profileWithRole.roleDetails = roleDetails;
                    profileWithRole.permissions = roleDetails.permissions;
                  }
                } catch (roleError) {
                  console.error("Failed to load role details from permission in AuthContext", roleError);
                } finally {
                  setRoleLoading(false);
                }
              } else {
                setRoleLoading(false);
              }
            }
            
            setUserProfile(profileWithRole);
            
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
        setRoleLoading(false);
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

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    userProfile,
    customClaims,
    loading,
    profileLoading,
    claimsLoading,
    roleLoading,
    updateCurrentAccountInProfile
  }), [
    user,
    userProfile,
    customClaims,
    loading,
    profileLoading,
    claimsLoading,
    roleLoading,
    updateCurrentAccountInProfile
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
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
