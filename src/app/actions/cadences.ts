"use server";

import { db } from "@/db";
import { salesCadences, cadenceSteps, cadenceEnrollments, tasks, contacts } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAuditEntry } from "@/lib/audit";

export async function getCadences() {
  const session = await auth();
  if (!session?.user) return [];

  const { orgId } = session.user;

  return db.query.salesCadences.findMany({
    where: eq(salesCadences.orgId, orgId),
    with: {
      steps: {
        orderBy: [cadenceSteps.stepNumber],
      },
      enrollments: {
        with: {
          contact: true,
          assignedUser: true,
        },
      },
    },
    orderBy: [desc(salesCadences.createdAt)],
  });
}

export async function createCadence(data: {
  name: string;
  description?: string;
  targetAudience: string;
  steps: {
    stepNumber: number;
    dayOffset: number;
    type: "email" | "call" | "whatsapp" | "task";
    title: string;
    instruction: string;
    cannedTemplate?: string;
  }[];
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const [cadence] = await db
    .insert(salesCadences)
    .values({
      orgId,
      name: data.name.trim(),
      description: data.description,
      targetAudience: data.targetAudience,
      isActive: true,
    })
    .returning();

  if (data.steps && data.steps.length > 0) {
    for (const step of data.steps) {
      await db.insert(cadenceSteps).values({
        cadenceId: cadence.id,
        stepNumber: step.stepNumber,
        dayOffset: step.dayOffset,
        type: step.type,
        title: step.title,
        instruction: step.instruction,
        cannedTemplate: step.cannedTemplate,
      });
    }
  }

  await logAuditEntry(orgId, userId, "create_cadence", "sales_cadences", cadence.id, {
    name: data.name,
    stepsCount: data.steps.length,
  });

  revalidatePath("/dashboard/cadences");
  return { success: true, cadenceId: cadence.id };
}

export async function enrollContactInCadence(data: {
  cadenceId: string;
  contactId: string;
  dealId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const cadence = await db.query.salesCadences.findFirst({
    where: and(eq(salesCadences.id, data.cadenceId), eq(salesCadences.orgId, orgId)),
    with: { steps: { orderBy: [cadenceSteps.stepNumber] } },
  });

  if (!cadence || cadence.steps.length === 0) {
    throw new Error("Cadence has no active steps");
  }

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, data.contactId),
  });

  const firstStep = cadence.steps[0];
  const dueDate = new Date(Date.now() + firstStep.dayOffset * 86400000).toISOString().slice(0, 10);

  const [enrollment] = await db
    .insert(cadenceEnrollments)
    .values({
      orgId,
      cadenceId: data.cadenceId,
      contactId: data.contactId,
      dealId: data.dealId,
      assignedUserId: userId,
      currentStep: 1,
      status: "in_progress",
      nextTaskDueAt: dueDate,
    })
    .returning();

  // Create immediate Day 1 Task for Rep
  await db.insert(tasks).values({
    orgId,
    title: `[Cadence: ${cadence.name}] ${firstStep.title} for ${contact?.firstName || "Lead"}`,
    description: `Step 1 of ${cadence.steps.length}: ${firstStep.instruction}\n\nSuggested Template: ${firstStep.cannedTemplate || "N/A"}`,
    dueDate,
    relatedContactId: data.contactId,
    assigneeId: userId,
    createdById: userId,
  });

  await logAuditEntry(orgId, userId, "enroll_cadence", "cadence_enrollments", enrollment.id, {
    contactId: data.contactId,
    cadenceName: cadence.name,
  });

  revalidatePath("/dashboard/cadences");
  revalidatePath("/dashboard/tasks");
  return { success: true, enrollmentId: enrollment.id };
}

export async function advanceCadenceStep(enrollmentId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  const enrollment = await db.query.cadenceEnrollments.findFirst({
    where: and(eq(cadenceEnrollments.id, enrollmentId), eq(cadenceEnrollments.orgId, orgId)),
    with: {
      cadence: { with: { steps: { orderBy: [cadenceSteps.stepNumber] } } },
      contact: true,
    },
  });

  if (!enrollment) throw new Error("Enrollment not found");

  const nextStepNumber = enrollment.currentStep + 1;
  const nextStep = enrollment.cadence.steps.find((s) => s.stepNumber === nextStepNumber);

  if (!nextStep) {
    // Cadence complete!
    await db
      .update(cadenceEnrollments)
      .set({ status: "completed", nextTaskDueAt: null })
      .where(eq(cadenceEnrollments.id, enrollmentId));

    revalidatePath("/dashboard/cadences");
    return { success: true, completed: true };
  }

  const nextDueDate = new Date(Date.now() + nextStep.dayOffset * 86400000).toISOString().slice(0, 10);

  await db
    .update(cadenceEnrollments)
    .set({
      currentStep: nextStepNumber,
      nextTaskDueAt: nextDueDate,
    })
    .where(eq(cadenceEnrollments.id, enrollmentId));

  // Create next task
  await db.insert(tasks).values({
    orgId,
    title: `[Cadence: ${enrollment.cadence.name}] ${nextStep.title} for ${enrollment.contact?.firstName || "Lead"}`,
    description: `Step ${nextStepNumber} of ${enrollment.cadence.steps.length}: ${nextStep.instruction}\n\nTemplate:\n${nextStep.cannedTemplate || "N/A"}`,
    dueDate: nextDueDate,
    relatedContactId: enrollment.contactId,
    assigneeId: userId,
    createdById: userId,
  });

  revalidatePath("/dashboard/cadences");
  revalidatePath("/dashboard/tasks");
  return { success: true, completed: false, nextStep: nextStepNumber };
}
