"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assert, canManageUsers, canInviteRole } from "@/lib/permissions";
import { logAuditEntry } from "@/lib/audit";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getTeamMembers() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.users.findMany({
    where: eq(users.orgId, session.user.orgId),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function inviteUser(data: {
  name: string;
  email: string;
  role: "admin" | "manager" | "rep";
  passwordHash: string; // Plain password passed from form, will hash here
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const actingRole = session.user.role;
  assert(canManageUsers(actingRole), "Access Denied: Only Admins/Managers can manage team members.");
  assert(canInviteRole(actingRole, data.role), `Access Denied: Cannot invite a user with role ${data.role}.`);

  // Check duplicate email
  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email.trim().toLowerCase()),
  });

  if (existing) {
    throw new Error("A user with this email address already exists.");
  }

  const hashed = await bcrypt.hash(data.passwordHash, 10);

  const [newUser] = await db
    .insert(users)
    .values({
      orgId: session.user.orgId,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      passwordHash: hashed,
      role: data.role,
      isActive: true,
    })
    .returning();

  await logAuditEntry(session.user.orgId, session.user.id, "invite", "user", newUser.id, {
    invitedEmail: data.email,
    role: data.role,
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateUserRole(targetUserId: string, nextRole: "admin" | "manager" | "rep") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  assert(session.user.role === "admin", "Access Denied: Only Admins can reassign user roles.");

  // Prevent self-demotion
  if (session.user.id === targetUserId) {
    throw new Error("You cannot change your own role.");
  }

  await db
    .update(users)
    .set({ role: nextRole })
    .where(and(eq(users.id, targetUserId), eq(users.orgId, session.user.orgId)));

  await logAuditEntry(session.user.orgId, session.user.id, "update_role", "user", targetUserId, {
    targetUserId,
    nextRole,
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function toggleUserStatus(targetUserId: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const actingRole = session.user.role;
  assert(canManageUsers(actingRole), "Access Denied");

  // Prevent self-deactivation
  if (session.user.id === targetUserId) {
    throw new Error("You cannot deactivate your own account.");
  }

  await db
    .update(users)
    .set({ isActive })
    .where(and(eq(users.id, targetUserId), eq(users.orgId, session.user.orgId)));

  await logAuditEntry(session.user.orgId, session.user.id, "toggle_active", "user", targetUserId, {
    targetUserId,
    isActive,
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}
