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

/**
 * Safely generates content using Gemini or fallback mocks.
 */
export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  if (!ai) {
    // Return mock response based on prompt hints
    if (prompt.toLowerCase().includes("draft")) {
      return "Dear customer, thank you for your time today. As discussed, we are excited to expand our fleet operations with you. Let me know if next Tuesday works for a proposal run. Best regards, Keel Sales.";
    }
    return "This is a simulated fallback response from Keel (Gemini key not configured).";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    return response.text || "";
  } catch (err) {
    console.error("Gemini text generation failed:", err);
    return "Error generating response from Gemini. Falling back to heuristic stub.";
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
  if (!ai) {
    // Heuristics/mock outputs
    console.log("Simulating JSON output for prompt:", prompt);
    
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
        summary: "The customer is highly interested in cargo routing. Requested fleet proposal.",
        sentiment: "positive",
        actionItems: ["Draft fleet proposal", "Schedule call for next Tuesday"],
        nextBestAction: "Email operations proposal",
        topics: ["Logistics", "Fleet", "Pricing"]
      } as unknown as T;
    }

    return {} as T;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2, // Lower temperature for more structured consistency
      },
    });

    const text = response.text;
    if (!text) throw new Error("Received empty response from Gemini");

    return JSON.parse(text) as T;
  } catch (err) {
    console.error("Gemini JSON generation failed:", err);
    throw err;
  }
}
