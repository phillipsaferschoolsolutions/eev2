// src/services/roleService.ts
'use client';

import { auth, firestore } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import type { Role, PermissionKey } from '@/types/Role';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DEFAULT_ROLE_PERMISSIONS, SYSTEM_ROLES } from '@/types/Role';



/**
 * Fetches a role by its ID
 * @param roleId The ID of the role to fetch
 * @returns The role object or null if not found
 */
export async function getRole(roleId: string): Promise<Role | null> {
  try {
    const roleDoc = await getDoc(doc(firestore, 'roles', roleId));
    if (roleDoc.exists()) {
      return { id: roleDoc.id, ...roleDoc.data() } as Role;
    }
    return null;
  } catch (error) {
    console.error("Error fetching role:", error);
    throw new Error(`Failed to fetch role: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetches all roles for an account
 * @param accountId The account ID to fetch roles for
 * @returns Array of role objects
 */
export async function getRoles(accountId: string): Promise<Role[]> {
  try {
    const rolesQuery = query(
      collection(firestore, 'roles'),
      where('account', '==', accountId)
    );
    const rolesSnapshot = await getDocs(rolesQuery);
    
    const roles: Role[] = [];
    rolesSnapshot.forEach(doc => {
      roles.push({ id: doc.id, ...doc.data() } as Role);
    });
    
    return roles;
  } catch (error) {
    console.error("Error fetching roles:", error);
    throw new Error(`Failed to fetch roles: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Creates a new role
 * @param role The role object to create
 * @returns The created role with its ID
 */
export async function createRole(role: Omit<Role, 'id'>): Promise<Role> {
  try {
    const newRoleRef = doc(collection(firestore, 'roles'));
    const newRole = {
      ...role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(newRoleRef, newRole);
    
    return {
      id: newRoleRef.id,
      ...newRole
    } as Role;
  } catch (error) {
    console.error("Error creating role:", error);
    throw new Error(`Failed to create role: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Updates an existing role
 * @param roleId The ID of the role to update
 * @param updates The updates to apply to the role
 * @returns The updated role
 */
export async function updateRole(roleId: string, updates: Partial<Role>): Promise<Role> {
  try {
    const roleRef = doc(firestore, 'roles', roleId);
    const roleDoc = await getDoc(roleRef);
    
    if (!roleDoc.exists()) {
      throw new Error(`Role with ID ${roleId} not found`);
    }
    
    // Don't allow updating system roles' core permissions
    const currentRole = roleDoc.data() as Role;
    if (currentRole.isSystem && updates.permissions) {
      throw new Error("Cannot modify permissions of a system role");
    }
    
    const updatedRole = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(roleRef, updatedRole);
    
    return {
      id: roleId,
      ...currentRole,
      ...updatedRole
    } as Role;
  } catch (error) {
    console.error("Error updating role:", error);
    throw new Error(`Failed to update role: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Deletes a role
 * @param roleId The ID of the role to delete
 */
export async function deleteRole(roleId: string): Promise<void> {
  try {
    const roleRef = doc(firestore, 'roles', roleId);
    const roleDoc = await getDoc(roleRef);
    
    if (!roleDoc.exists()) {
      throw new Error(`Role with ID ${roleId} not found`);
    }
    
    const role = roleDoc.data() as Role;
    if (role.isSystem) {
      throw new Error("Cannot delete a system role");
    }
    
    await deleteDoc(roleRef);
  } catch (error) {
    console.error("Error deleting role:", error);
    throw new Error(`Failed to delete role: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Initializes the default system roles if they don't exist
 * This should be called once during application setup
 * @param accountId The account ID to create the roles for
 */
export async function initializeDefaultRoles(accountId: string): Promise<void> {
  try {
    const batch = firestore.batch();
    
    // Create each system role if it doesn't exist
    for (const [roleId, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const roleRef = doc(firestore, 'roles', roleId);
      const roleDoc = await getDoc(roleRef);
      
      if (!roleDoc.exists()) {
        const roleName = roleId.replace(/([A-Z])/g, ' $1').trim(); // Convert camelCase to Title Case
        
        batch.set(roleRef, {
          name: roleName,
          description: `Default ${roleName} role`,
          permissions,
          account: accountId,
          isSystem: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }
    
    await batch.commit();
    console.log("Default roles initialized successfully");
  } catch (error) {
    console.error("Error initializing default roles:", error);
    throw new Error(`Failed to initialize default roles: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Checks if a user has a specific permission
 * @param userPermissions The user's permissions map
 * @param permissionKey The permission key to check
 * @returns True if the user has the permission, false otherwise
 */
export function hasPermission(userPermissions: Record<string, boolean> | undefined, permissionKey: PermissionKey): boolean {
  if (!userPermissions) return false;
  return !!userPermissions[permissionKey];
}