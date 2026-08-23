export type Role = "admin" | "manager" | "rep";

export const canViewAllRecords = (role: Role) => role === "admin" || role === "manager";
export const canManagePipelines = (role: Role) => role === "admin" || role === "manager";
export const canManageUsers = (role: Role) => role === "admin" || role === "manager";
export const canManageApiKeysAndWebhooks = (role: Role) => role === "admin";
export const canManageOrgSettings = (role: Role) => role === "admin";
export const canReassignRecords = (role: Role) => role === "admin" || role === "manager";
export const canViewAuditLog = (role: Role) => role === "admin" || role === "manager";
export const canManageCustomFields = (role: Role) => role === "admin" || role === "manager";

/** Managers may only invite Reps; Admins may invite any role. */
export function canInviteRole(actingRole: Role, targetRole: Role): boolean {
  if (actingRole === "admin") return true;
  if (actingRole === "manager") return targetRole === "rep";
  return false;
}

/**
 * Returns the ownerId a query should be filtered to, or null for "no filter, see everything".
 * Reps only ever see their own records; Admins/Managers see the whole org.
 */
export function ownerScope(role: Role, userId: string): string | null {
  return role === "rep" ? userId : null;
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) throw new ForbiddenError(message);
}
