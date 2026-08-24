"use server";

import { db } from "@/db";
import { projects, projectTasks, deliverables, activities, clients } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getProjects() {
  const session = await auth();
  if (!session?.user) return [];

  return db.query.projects.findMany({
    where: eq(projects.orgId, session.user.orgId),
    with: { client: true, deal: true },
    orderBy: [desc(projects.createdAt)],
  });
}

export async function createProject(data: {
  title: string;
  clientName: string;
  budget?: number;
  status?: "planning" | "active" | "completed" | "on_hold";
  dealId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId } = session.user;

  let client = await db.query.clients.findFirst({
    where: and(eq(clients.orgId, orgId), eq(clients.name, data.clientName.trim())),
  });

  if (!client) {
    const [newClient] = await db
      .insert(clients)
      .values({
        orgId,
        name: data.clientName.trim(),
        portalToken: `pt_${crypto.randomUUID()}`,
      })
      .returning();
    client = newClient;
  }

  const [proj] = await db
    .insert(projects)
    .values({
      orgId,
      clientId: client.id,
      dealId: data.dealId || null,
      name: data.title.trim(),
      status: data.status || "active",
      budget: data.budget || 0,
    })
    .returning();

  await db.insert(activities).values({
    orgId,
    type: "system",
    body: `Project initiated: "${proj.name}" for client ${client.name}`,
    source: "manual",
  });

  revalidatePath("/dashboard/projects");
  return proj;
}

export async function updateProjectStatus(id: string, status: "planning" | "active" | "completed" | "on_hold") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [updated] = await db
    .update(projects)
    .set({ status })
    .where(and(eq(projects.id, id), eq(projects.orgId, session.user.orgId)))
    .returning();

  revalidatePath("/dashboard/projects");
  return updated;
}
