"use client";

import React from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import type { PermissionKey } from '@/types/Role';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface PermissionGuardProps {
  /**
   * The permission key required to access the content
   */
  permission: PermissionKey;
  
  /**
   * Multiple permission keys - user must have at least one of these
   */
  anyPermission?: PermissionKey[];
  
  /**
   * Multiple permission keys - user must have all of these
   */
  allPermissions?: PermissionKey[];
  
  /**
   * The content to render if the user has the required permission(s)
   */
  children: React.ReactNode;
  
  /**
   * Custom content to render if the user doesn't have the required permission(s)
   */
  fallback?: React.ReactNode;
}

/**
 * A component that conditionally renders its children based on the user's permissions
 */
export function PermissionGuard({
  permission,
  anyPermission,
  allPermissions,
  children,
  fallback
}: PermissionGuardProps) {
  const { can, canAny, canAll } = usePermissions();
  
  // Check permissions based on the provided props
  let hasPermission = false;
  
  if (anyPermission && anyPermission.length > 0) {
    hasPermission = canAny(anyPermission);
  } else if (allPermissions && allPermissions.length > 0) {
    hasPermission = canAll(allPermissions);
  } else {
    hasPermission = can(permission);
  }
  
  // If the user has the required permission(s), render the children
  if (hasPermission) {
    return <>{children}</>;
  }
  
  // Otherwise, render the fallback or a default access denied message
  return (
    <>
      {fallback || (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have the necessary permissions to access this content.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}