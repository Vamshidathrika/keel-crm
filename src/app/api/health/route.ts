import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();

  try {
    // 1. Verify Database Reachability
    const orgCount = await db.select().from(organizations).limit(1);
    const dbLatencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "healthy",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: "connected",
            latencyMs: dbLatencyMs,
          },
          memory: {
            heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          },
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message || "Database health check failed",
      },
      { status: 503 }
    );
  }
}
