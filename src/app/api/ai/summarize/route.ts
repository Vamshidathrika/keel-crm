import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ summary: "No conversation history to summarize." });
    }

    const conversationText = messages
      .map((m: any) => `${m.sender || m.direction === "outbound" ? "Agent" : "Client"}: ${m.text}`)
      .join("\n");

    const hasGeminiKey = !!process.env.GOOGLE_API_KEY || !!process.env.GEMINI_API_KEY;

    let summaryText = "";
    if (hasGeminiKey) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const aiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
        const ai = new GoogleGenAI({ apiKey: aiKey });
        
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Summarize the following customer communication thread in 2 bullet points:\n\n${conversationText}`,
        });
        summaryText = response.text || "Failed to generate AI summary.";
      } catch (err) {
        summaryText = `Failed to generate Gemini summary, falling back to local extractor.`;
      }
    }

    if (!summaryText || summaryText.includes("falling back")) {
      // Offline fallback: Rule-based summary
      const clientLines = messages.filter((m: any) => m.sender === "client" || m.direction === "inbound");
      const agentLines = messages.filter((m: any) => m.sender !== "client" && m.direction !== "inbound");
      summaryText = `• Client requested information regarding ${clientLines[0]?.text?.slice(0, 30) || "service status"} (${clientLines.length} messages).\n• Agent provided updates and templates (${agentLines.length} updates dispatched).`;
    }

    return NextResponse.json({ summary: summaryText });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to summarize" }, { status: 500 });
  }
}
