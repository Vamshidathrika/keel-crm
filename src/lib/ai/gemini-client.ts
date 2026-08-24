import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

let aiClient: GoogleGenAI | null = null;

if (apiKey && apiKey !== "YOUR_GEMINI_API_KEY") {
  try {
    aiClient = new GoogleGenAI({ apiKey });
    console.log("Gemini client successfully initialized.");
  } catch (err) {
    console.error("Failed to initialize Gemini client:", err);
  }
} else {
  console.warn("GEMINI_API_KEY is not set. Keel will run in simulation fallback mode.");
}

export const ai = aiClient;

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries <= 0) throw err;
    const isRateLimit = err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("RESOURCE_EXHAUSTED");
    const isServerError = err?.status >= 500 || err?.message?.includes("503");
    if (isRateLimit || isServerError) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

/**
 * Safely generates content using Gemini or fallback mocks.
 */
export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  if (!ai) {
    if (prompt.toLowerCase().includes("draft")) {
      return "Dear partner, thank you for connecting with us. Following our recent discussion, I have prepared the preliminary details for your review. Please let me know when you are available for a brief follow-up call. Best regards, Keel CRM.";
    }
    return "• Focus on following up with top qualified inbound leads today.\n• Review pending proposal reviews with high close probabilities.\n• Complete scheduled customer touchpoints.";
  }

  try {
    return await retryWithBackoff(async () => {
      const response = await ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      return response.text || "";
    });
  } catch (err) {
    console.error("Gemini text generation failed after retries:", err);
    return "• Prioritize high-value deals closing this month.\n• Re-engage accounts with recent activity updates.\n• Confirm next scheduled milestones.";
  }
}

/**
 * Safely generates structured JSON content.
 */
export async function generateJSON<T>(
  prompt: string,
  responseSchema: any,
  systemInstruction?: string
): Promise<T> {
  const getFallbackJSON = (): T => {
    if (prompt.toLowerCase().includes("score")) {
      return {
        score: 82,
        band: "hot",
        factors: [
          { label: "Positive call outcome", direction: "up", explanation: "Contact was marked interested in calls." },
          { label: "Deal size", direction: "up", explanation: "High deal value." }
        ],
        recommendation: "Immediate follow up is recommended."
      } as unknown as T;
    }

    if (prompt.toLowerCase().includes("transcript") || prompt.toLowerCase().includes("summary")) {
      return {
        summary: "Customer expressed strong interest in workflow expansion and requested proposal details.",
        sentiment: "positive",
        actionItems: ["Draft enterprise proposal", "Schedule review call"],
        nextBestAction: "Send customized proposal breakdown",
        topics: ["Operations", "Expansion", "Pricing"]
      } as unknown as T;
    }

    return {} as T;
  };

  if (!ai) {
    return getFallbackJSON();
  }

  try {
    return await retryWithBackoff(async () => {
      const response = await ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.2,
        },
      });

      const text = response.text;
      if (!text) throw new Error("Received empty response from Gemini");

      return JSON.parse(text) as T;
    });
  } catch (err) {
    console.error("Gemini JSON generation failed after retries:", err);
    return getFallbackJSON();
  }
}
