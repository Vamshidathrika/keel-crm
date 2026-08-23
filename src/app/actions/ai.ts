"use server";

import { db } from "@/db";
import { activities, tasks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { summarizeConversation } from "@/lib/ai/summarize";
import { scoreContact } from "@/lib/ai/scoring";
import { logAuditEntry } from "@/lib/audit";
import { generateText } from "@/lib/ai/gemini-client";
import { notifications, contacts, deals } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function analyzeTranscript(contactId: string, transcript: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  // 1. Run Conversation Intelligence
  const analysis = await summarizeConversation(transcript);

  // 2. Insert AI Summary Activity
  const bodyText = `Call Analysis Summary: ${analysis.summary}\n\nTopics: ${analysis.topics.join(", ")}\nNext Best Action: ${analysis.nextBestAction}`;
  
  await db.insert(activities).values({
    orgId,
    type: "ai",
    relatedContactId: contactId,
    actorUserId: userId,
    body: bodyText,
    metadata: {
      summary: analysis.summary,
      sentiment: analysis.sentiment,
      actionItems: analysis.actionItems,
      nextBestAction: analysis.nextBestAction,
      topics: analysis.topics,
      transcript,
    },
    source: "ai",
  });

  // 3. Retrieve contact to find owner
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });

  const assigneeId = contact?.ownerId || userId;

  // 4. Auto-create tasks from action items
  for (const item of analysis.actionItems) {
    await db.insert(tasks).values({
      orgId,
      title: item.slice(0, 80),
      description: `Auto-generated follow-up task from AI call analysis.\nAction item: ${item}`,
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), // Default 2 days due
      isDone: false,
      relatedContactId: contactId,
      assigneeId,
      createdById: userId,
    });
  }

  // 5. Trigger Lead Scoring recalculation
  await scoreContact(contactId);

  await logAuditEntry(orgId, userId, "analyze_transcript", "contact", contactId, {
    sentiment: analysis.sentiment,
    actionItemsCount: analysis.actionItems.length,
  });

  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/tasks");

  return { success: true, analysis };
}

export async function draftFollowUp(contactId: string, channel: "email" | "whatsapp") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });
  if (!contact) throw new Error("Contact not found");

  const recentNotes = await db.query.activities.findMany({
    where: eq(activities.relatedContactId, contactId),
    orderBy: [desc(activities.occurredAt)],
    limit: 3,
  });

  const historyText = recentNotes.map(n => `- ${n.body}`).join("\n");

  const prompt = `
    Draft a personalized follow-up ${channel} message for B2B client ${contact.firstName} ${contact.lastName || ""}.
    Details:
    - Title: ${contact.title || "Partner"}
    - Location: ${contact.city || "India"}
    - Recent activities:
      ${historyText}

    Ensure the tone is professional, extremely concise, action-driven, and friendly. Do not output subject headers if drafting for WhatsApp.
  `;

  const systemInstruction = "You are a professional B2B relationship manager. Draft a concise follow-up email or WhatsApp message. Output ONLY the email/message body.";

  const draft = await generateText(prompt, systemInstruction);

  await logAuditEntry(session.user.orgId, session.user.id, "draft_followup", "contact", contactId, {
    channel,
  });

  return { draft };
}

export async function generateDailyBrief() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { orgId, id: userId } = session.user;

  // Fetch hot leads (score >= 75)
  const hotContacts = await db.query.contacts.findMany({
    where: and(eq(contacts.orgId, orgId), sql`${contacts.score} >= 75`),
    limit: 3,
  });

  // Fetch stale deals
  const staleDeals = await db.query.deals.findMany({
    where: and(eq(deals.orgId, orgId), sql`json_contains(${deals.healthFlags}, '"stale_deal"')`),
    limit: 3,
  });

  const prompt = `
    Generate a concise, morning priority digest narrative (3-4 bullet points) for sales rep ${session.user.name}.
    Context:
    - High-priority hot leads needing calls: ${hotContacts.map(c => `${c.firstName} (Score ${c.score})`).join(", ") || "None"}
    - Stale deal warning flags: ${staleDeals.map(d => d.title).join(", ") || "None"}
    
    Synthesize these into actionable, crisp focus points for today.
  `;

  const systemInstruction = "You are a sales operations manager. Summarize the priority metrics into 3-4 bullet points.";
  const summary = await generateText(prompt, systemInstruction);

  // Insert notification
  const [notif] = await db
    .insert(notifications)
    .values({
      orgId,
      userId,
      type: "digest",
      title: "Your Morning AI Briefing",
      body: summary.slice(0, 500),
      link: "/dashboard",
      isRead: false,
    })
    .returning();

  revalidatePath("/dashboard");

  return { success: true, briefing: summary };
}

export async function runLeadScoring(contactId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return scoreContact(contactId);
}
