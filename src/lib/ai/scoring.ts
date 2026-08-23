import { db } from "@/db";
import { contacts, activities, deals, stages } from "@/db/schema";
import { generateJSON } from "./gemini-client";
import { Type } from "@google/genai";
import { eq, and, desc } from "drizzle-orm";

const scoreResponseSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER, description: "Refined lead score between 0 and 100" },
    band: { type: Type.STRING, enum: ["hot", "warm", "cold"], description: "The classification band" },
    factors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: "Short title of factor (e.g. High Call Duration)" },
          direction: { type: Type.STRING, enum: ["up", "down"], description: "Whether this increased or decreased the score" },
          explanation: { type: Type.STRING, description: "Detailed contextual reason" },
        },
        required: ["label", "direction", "explanation"],
      },
    },
    recommendation: { type: Type.STRING, description: "Next best action advice for sales rep" },
  },
  required: ["score", "band", "factors", "recommendation"],
};

export async function scoreContact(contactId: string) {
  // 1. Fetch contact and relations
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
    with: {
      company: true,
    },
  });

  if (!contact) throw new Error("Contact not found");

  const contactActivities = await db.query.activities.findMany({
    where: eq(activities.relatedContactId, contactId),
    orderBy: [desc(activities.occurredAt)],
  });

  const contactDeals = await db.query.deals.findMany({
    where: eq(deals.contactId, contactId),
    with: {
      stage: true,
    },
  });

  // 2. Heuristic calculations
  let score = 30; // base score
  const explanationFactors: { label: string; direction: "up" | "down"; explanation: string }[] = [];

  // Parse Call outcomes
  const callLogs = contactActivities.filter((a) => a.type === "call");
  for (const call of callLogs) {
    const outcome = call.metadata?.outcome as string | undefined;
    const duration = Number(call.metadata?.duration) || 0;

    if (outcome === "interested") {
      score += 25;
      explanationFactors.push({
        label: "Call Interested",
        direction: "up",
        explanation: "Contact expressed interest during an outbound call.",
      });
    } else if (outcome === "scheduled") {
      score += 35;
      explanationFactors.push({
        label: "Meeting Booked",
        direction: "up",
        explanation: "Outbound agent successfully booked a meeting slot.",
      });
    } else if (outcome === "not_interested") {
      score -= 25;
      explanationFactors.push({
        label: "Call Disinterest",
        direction: "down",
        explanation: "Contact indicated they were not interested.",
      });
    } else if (outcome === "wrong_number") {
      score -= 45;
      explanationFactors.push({
        label: "Invalid Phone",
        direction: "down",
        explanation: "Number was marked as wrong number by agent.",
      });
    }

    if (duration > 60) {
      score += 10;
      explanationFactors.push({
        label: "High Call Duration",
        direction: "up",
        explanation: "Spoke with agent for over 60 seconds, indicating engagement.",
      });
    }
  }

  // Parse linked deals
  for (const deal of contactDeals) {
    if (deal.value > 5000000) {
      score += 15;
      explanationFactors.push({
        label: "High Deal Value",
        direction: "up",
        explanation: "Associated with a deal valued over ₹50L.",
      });
    }
    const dealAny = deal as any;
    if (dealAny.stage?.type === "won") {
      score = 95;
      explanationFactors.push({
        label: "Closed Won Deal",
        direction: "up",
        explanation: "A deal with this contact has successfully closed won.",
      });
    } else if (dealAny.stage?.type === "lost") {
      score = Math.min(score, 15);
      explanationFactors.push({
        label: "Closed Lost Deal",
        direction: "down",
        explanation: "Deals associated with this contact were closed lost.",
      });
    } else if (dealAny.stage?.name === "Qualified" || dealAny.stage?.name === "Proposal") {
      score += 10;
      explanationFactors.push({
        label: "Advanced Deal Stage",
        direction: "up",
        explanation: `Deal is in advanced state: ${dealAny.stage.name}.`,
      });
    }
  }

  // Velocity (recent activities)
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
  const recentActivities = contactActivities.filter(
    (a) => new Date(a.occurredAt) >= threeDaysAgo
  );
  if (recentActivities.length >= 3) {
    score += 15;
    explanationFactors.push({
      label: "Recent Velocity Burst",
      direction: "up",
      explanation: "Had 3 or more timeline interactions in the last 72 hours.",
    });
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));
  let band: "hot" | "warm" | "cold" = "cold";
  if (score >= 75) band = "hot";
  else if (score >= 45) band = "warm";

  const defaultRecommendation =
    score >= 75
      ? "Recommend immediate human outreach while interest is peak."
      : score >= 45
      ? "Schedule a voice follow-up call within 3 days."
      : "Enroll in WhatsApp warm-up campaign.";

  // 3. AI Pass
  try {
    const prompt = `
      Evaluate this B2B Sales Lead and provide a refined lead score (0-100), classification band (hot/warm/cold), positive/negative scoring factors, and next-best-action recommendation.

      Contact Profile:
      - Name: ${contact.firstName} ${contact.lastName || ""}
      - Title: ${contact.title || "Unknown"}
      - City: ${contact.city || "Unknown"}
      - Industry: ${(contact as any).company?.industry || "Unknown"}
      
      Outbound Call Log Statistics:
      - Total calls: ${callLogs.length}
      - Detailed activities list:
        ${JSON.stringify(contactActivities.map((a) => ({ type: a.type, body: a.body, meta: a.metadata })))}

      Heuristic baseline score calculated: ${score} (Band: ${band})
      Factors identified by rules: ${JSON.stringify(explanationFactors)}
    `;

    const systemInstruction = "You are an expert sales analyst. Refine the lead score based on call engagement, profile matching, and intent signals. Return a structured JSON matching the provided schema.";

    const aiResult = await generateJSON<any>(prompt, scoreResponseSchema, systemInstruction);

    // Save back to DB
    await db
      .update(contacts)
      .set({
        score: aiResult.score,
        scoreBreakdown: {
          band: aiResult.band,
          factors: aiResult.factors,
          recommendation: aiResult.recommendation,
        },
      })
      .where(eq(contacts.id, contactId));

    return aiResult;
  } catch (error) {
    console.error("AI scoring failed, using heuristics fallback:", error);

    const fallbackResult = {
      score,
      band,
      factors: explanationFactors.length > 0 ? explanationFactors : [{
        label: "Profile baseline",
        direction: "up" as const,
        explanation: "Scored using standard company heuristic rules.",
      }],
      recommendation: defaultRecommendation,
    };

    // Save fallback to DB
    await db
      .update(contacts)
      .set({
        score: fallbackResult.score,
        scoreBreakdown: fallbackResult,
      })
      .where(eq(contacts.id, contactId));

    return fallbackResult;
  }
}
