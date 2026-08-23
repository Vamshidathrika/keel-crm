import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAuditEntry(
  orgId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  diff?: Record<string, unknown>
) {
  try {
    await db.insert(auditLogs).values({
      orgId,
      actorUserId: userId,
      action,
      entityType,
      entityId,
      diff,
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
