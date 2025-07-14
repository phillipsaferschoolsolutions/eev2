// src/hooks/use-permissions.ts
'use client';

import { useAuth } from '@/context/auth-context';
import type { PermissionKey } from '@/types/Role';
import { hasPermission } from '@/services/roleService';

/**
 * Custom hook to check if the current user has a specific permission
 * @returns An object with utility functions for checking permissions
 */
export function usePermissions() {
  const { userProfile } = useAuth();
  
  /**
   * Checks if the current user has a specific permission
   * @param permissionKey The permission key to check
   * @returns True if the user has the permission, false otherwise
   */
  const can = (permissionKey: PermissionKey): boolean => {
    return hasPermission(userProfile?.permissions, permissionKey);
  };
  
  /**
   * Checks if the current user has any of the specified permissions
   * @param permissionKeys Array of permission keys to check
   * @returns True if the user has any of the permissions, false otherwise
   */
  const canAny = (permissionKeys: PermissionKey[]): boolean => {
    return permissionKeys.some(key => can(key));
  };
  
  /**
   * Checks if the current user has all of the specified permissions
   * @param permissionKeys Array of permission keys to check
   * @returns True if the user has all of the permissions, false otherwise
   */
  const canAll = (permissionKeys: PermissionKey[]): boolean => {
    return permissionKeys.every(key => can(key));
  };
  
  /**
   * Returns a filtered array of items based on a permission check
   * @param items Array of items to filter
   * @param getPermissionKey Function that returns the permission key for an item
   * @returns Filtered array of items
   */
  const filterByPermission = <T>(
    items: T[],
    getPermissionKey: (item: T) => PermissionKey
  ): T[] => {
    return items.filter(item => can(getPermissionKey(item)));
  };
  
  return {
    can,
    canAny,
    canAll,
    filterByPermission,
    // For convenience, expose the user's role
    role: userProfile?.role || null,
    // For advanced use cases, expose the full permissions map
    permissions: userProfile?.permissions || {}
  };
}