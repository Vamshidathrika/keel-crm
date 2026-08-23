import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { dealName, clientName, lastMessage } = await req.json();

    const hasGeminiKey = !!process.env.GOOGLE_API_KEY || !!process.env.GEMINI_API_KEY;

    let draftText = "";
    if (hasGeminiKey) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const aiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
        const ai = new GoogleGenAI({ apiKey: aiKey });

        const prompt = `Draft a short, friendly WhatsApp followup message from the agent to ${clientName || "the client"} regarding the deal '${dealName || "project"}'. Last message from client: "${lastMessage || "None"}". Keep it under 2 sentences.`;
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        draftText = response.text?.trim() || "";
      } catch (err) {
        draftText = "";
      }
    }

    if (!draftText) {
      // Offline fallback: Rule-based template
      draftText = `Hi ${clientName || "there"}, just wanted to check if you had a chance to review our latest proposal for the ${dealName || "project"}. Let me know if you need any adjustments!`;
    }

    return NextResponse.json({ suggestion: draftText });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to suggest followup" }, { status: 500 });
  }
}
