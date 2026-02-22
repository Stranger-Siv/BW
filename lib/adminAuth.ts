/**
 * Use in API routes: allow both admin and super_admin to access admin dashboard features.
 */
export function isAdminOrSuperAdmin(session: { user?: { role?: string } } | null): boolean {
  const role = session?.user?.role;
  return role === "admin" || role === "super_admin";
}

/**
 * Use in API routes: only super_admin can manage users, roles, and bans.
 */
export function isSuperAdmin(session: { user?: { role?: string } } | null): boolean {
  return session?.user?.role === "super_admin";
}
