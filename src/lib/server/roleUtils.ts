/**
 * Role-based access control utilities
 */

import type { User } from '@prisma/client';

export type UserRole = 'FULL_ADMIN' | 'READ_ONLY_ADMIN' | 'INTERNAL_TESTER' | null;

/**
 * Check if user is a full admin (has write access to all admin features)
 */
export function isFullAdmin(user: Pick<User, 'role' | 'adminOfSchools'> & { adminOfSchools: unknown[] }): boolean {
  return user.role === 'FULL_ADMIN' && user.adminOfSchools.length > 0;
}

/**
 * Check if user is a read-only admin (has view-only access to admin features)
 */
export function isReadOnlyAdmin(user: Pick<User, 'role' | 'adminOfSchools'> & { adminOfSchools: unknown[] }): boolean {
  return user.role === 'READ_ONLY_ADMIN' && user.adminOfSchools.length > 0;
}

/**
 * Check if user is any type of admin (full or read-only)
 */
export function isAdmin(user: Pick<User, 'role' | 'adminOfSchools'> & { adminOfSchools: unknown[] }): boolean {
  return user.adminOfSchools.length > 0 && (user.role === 'FULL_ADMIN' || user.role === 'READ_ONLY_ADMIN');
}

/**
 * Check if user has write access for admin features
 */
export function canWriteAdminData(user: Pick<User, 'role' | 'adminOfSchools'> & { adminOfSchools: unknown[] }): boolean {
  return isFullAdmin(user);
}

/**
 * Check if user can access admin dashboards (read-only or full access)
 */
export function canAccessAdminDashboard(user: Pick<User, 'role' | 'adminOfSchools'> & { adminOfSchools: unknown[] }): boolean {
  return isAdmin(user);
}

/**
 * Check if user can manage other admin accounts
 */
export function canManageAdmins(user: Pick<User, 'role' | 'adminOfSchools'> & { adminOfSchools: unknown[] }): boolean {
  return isFullAdmin(user);
}

/**
 * Check if user can access specific admin features that are hidden from read-only admins
 * (Messaging, Lottery, Event Management)
 */
export function canAccessFullAdminFeatures(user: Pick<User, 'role' | 'adminOfSchools'> & { adminOfSchools: unknown[] }): boolean {
  return isFullAdmin(user);
}

