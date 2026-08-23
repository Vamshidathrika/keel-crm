"use server";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assert, canViewAuditLog } from "@/lib/permissions";
import { eq, desc } from "drizzle-orm";

export async function getAuditLogs() {
  const session = await auth();
  if (!session?.user) return [];

  assert(canViewAuditLog(session.user.role), "Access Denied: Only Admins/Managers can view audit logs.");

  return db.query.auditLogs.findMany({
    where: eq(auditLogs.orgId, session.user.orgId),
    orderBy: [desc(auditLogs.createdAt)],
    with: {
      actorUserId: {
        columns: {
          name: true,
          email: true,
        },
      },
    },
    limit: 100, // Show latest 100 entries
  });
}
