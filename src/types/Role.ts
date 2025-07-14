// src/types/Role.ts

/**
 * Represents a role in the system with associated permissions
 */
export interface Role {
  id: string;           // Role identifier (e.g., "admin", "teacher", "user")
  name: string;         // Display name (e.g., "Administrator")
  description: string;  // Description of the role's purpose
  permissions: Record<string, boolean>; // Map of permission keys to boolean values
  account?: string;     // Optional account ID if role is account-specific
  isSystem?: boolean;   // Whether this is a system-defined role that cannot be modified
  createdAt?: any;      // Timestamp when the role was created
  updatedAt?: any;      // Timestamp when the role was last updated
}

/**
 * Permission key structure follows the pattern: module.function.action
 * Examples:
 * - "dashboard.view" - Can view the dashboard
 * - "assignments.create" - Can create assignments
 * - "admin.users.manage" - Can manage users in the admin panel
 */
export type PermissionKey = string;

/**
 * Predefined system roles
 */
export const SYSTEM_ROLES = {
  SUPER_ADMIN: "superAdmin",
  ADMIN: "admin",
  SITE_ADMIN: "siteAdmin",
  POWER_USER: "powerUser",
  USER: "user",
  GUEST: "guest",
};

/**
 * Default permissions for system roles
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  [SYSTEM_ROLES.SUPER_ADMIN]: {
    // Dashboard
    "dashboard.view": true,
    
    // Assignments
    "assignments.create": true,
    "assignments.edit": true,
    "assignments.delete": true,
    "assignments.view_all": true,
    "assignments.complete": true,
    
    // Admin
    "admin.access": true,
    "admin.users.manage": true,
    "admin.locations.manage": true,
    "admin.roles.manage": true,
    "admin.switch_account": true,
    
    // Messaging
    "messaging.send": true,
    "messaging.view_all": true,
    
    // Report Studio
    "report_studio.access": true,
    "report_studio.generate": true,
    "report_studio.templates.manage": true,
    
    // Map
    "map.view": true,
    "map.edit": true,
    
    // Drill Tracking
    "drill_tracking.create": true,
    "drill_tracking.edit": true,
    "drill_tracking.delete": true,
    "drill_tracking.view_all": true,
    
    // Resources
    "resources.upload": true,
    "resources.delete": true,
    "resources.view_all": true,
    
    // Analysis Tools
    "photo_analysis.run": true,
    "policy_analysis.run": true,
    
    // Settings
    "settings.view": true,
    "settings.edit": true,
    
    // Theming
    "theming.change": true
  },
  
  [SYSTEM_ROLES.ADMIN]: {
    // Dashboard
    "dashboard.view": true,
    
    // Assignments
    "assignments.create": true,
    "assignments.edit": true,
    "assignments.delete": true,
    "assignments.view_all": true,
    "assignments.complete": true,
    
    // Admin
    "admin.access": true,
    "admin.users.manage": true,
    "admin.locations.manage": true,
    
    // Messaging
    "messaging.send": true,
    "messaging.view_all": false,
    
    // Report Studio
    "report_studio.access": true,
    "report_studio.generate": true,
    "report_studio.templates.manage": true,
    
    // Map
    "map.view": true,
    "map.edit": true,
    
    // Drill Tracking
    "drill_tracking.create": true,
    "drill_tracking.edit": true,
    "drill_tracking.delete": true,
    "drill_tracking.view_all": true,
    
    // Resources
    "resources.upload": true,
    "resources.delete": true,
    "resources.view_all": true,
    
    // Analysis Tools
    "photo_analysis.run": true,
    "policy_analysis.run": true,
    
    // Settings
    "settings.view": true,
    "settings.edit": true,
    
    // Theming
    "theming.change": true
  },
  
  [SYSTEM_ROLES.SITE_ADMIN]: {
    // Dashboard
    "dashboard.view": true,
    
    // Assignments
    "assignments.create": true,
    "assignments.edit": true,
    "assignments.delete": false,
    "assignments.view_all": true,
    "assignments.complete": true,
    
    // Admin
    "admin.access": true,
    "admin.users.manage": false,
    "admin.locations.manage": false,
    
    // Messaging
    "messaging.send": true,
    "messaging.view_all": false,
    
    // Report Studio
    "report_studio.access": true,
    "report_studio.generate": true,
    "report_studio.templates.manage": false,
    
    // Map
    "map.view": true,
    "map.edit": false,
    
    // Drill Tracking
    "drill_tracking.create": true,
    "drill_tracking.edit": true,
    "drill_tracking.delete": false,
    "drill_tracking.view_all": true,
    
    // Resources
    "resources.upload": true,
    "resources.delete": false,
    "resources.view_all": true,
    
    // Analysis Tools
    "photo_analysis.run": true,
    "policy_analysis.run": true,
    
    // Settings
    "settings.view": true,
    "settings.edit": false,
    
    // Theming
    "theming.change": false
  },
  
  [SYSTEM_ROLES.POWER_USER]: {
    // Dashboard
    "dashboard.view": true,
    
    // Assignments
    "assignments.create": true,
    "assignments.edit": true,
    "assignments.delete": false,
    "assignments.view_all": false,
    "assignments.complete": true,
    
    // Admin
    "admin.access": false,
    
    // Messaging
    "messaging.send": true,
    "messaging.view_all": false,
    
    // Report Studio
    "report_studio.access": true,
    "report_studio.generate": true,
    "report_studio.templates.manage": false,
    
    // Map
    "map.view": true,
    "map.edit": false,
    
    // Drill Tracking
    "drill_tracking.create": false,
    "drill_tracking.edit": false,
    "drill_tracking.delete": false,
    "drill_tracking.view_all": true,
    
    // Resources
    "resources.upload": true,
    "resources.delete": false,
    "resources.view_all": true,
    
    // Analysis Tools
    "photo_analysis.run": true,
    "policy_analysis.run": true,
    
    // Settings
    "settings.view": true,
    "settings.edit": false,
    
    // Theming
    "theming.change": false
  },
  
  [SYSTEM_ROLES.USER]: {
    // Dashboard
    "dashboard.view": true,
    
    // Assignments
    "assignments.create": false,
    "assignments.edit": false,
    "assignments.delete": false,
    "assignments.view_all": false,
    "assignments.complete": true,
    
    // Admin
    "admin.access": false,
    
    // Messaging
    "messaging.send": true,
    "messaging.view_all": false,
    
    // Report Studio
    "report_studio.access": false,
    
    // Map
    "map.view": true,
    "map.edit": false,
    
    // Drill Tracking
    "drill_tracking.view_all": true,
    
    // Resources
    "resources.upload": false,
    "resources.view_all": true,
    
    // Analysis Tools
    "photo_analysis.run": false,
    "policy_analysis.run": false,
    
    // Settings
    "settings.view": true,
    "settings.edit": false,
    
    // Theming
    "theming.change": false
  },
  
  [SYSTEM_ROLES.GUEST]: {
    // Dashboard
    "dashboard.view": true,
    
    // Assignments
    "assignments.complete": false,
    
    // Map
    "map.view": true,
    
    // Resources
    "resources.view_all": true,
    
    // Settings
    "settings.view": true,
    
    // Theming
    "theming.change": false
  }
};