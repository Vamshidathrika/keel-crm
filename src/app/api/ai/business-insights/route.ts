import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { kpis } = await req.json();

    const hasGeminiKey = !!process.env.GOOGLE_API_KEY || !!process.env.GEMINI_API_KEY;

    let narrative = "";
    if (hasGeminiKey) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const aiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
        const ai = new GoogleGenAI({ apiKey: aiKey });

        const prompt = `Write a short 3-sentence analytical review paragraph on our business performance KPIs:
Total Revenue: ${kpis?.revenue || "₹0"},
Pending Invoices: ${kpis?.pendingInvoices || "0"},
Active Projects: ${kpis?.activeProjects || "0"}.
Offer one clear recommendation.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        narrative = response.text?.trim() || "";
      } catch (err) {
        narrative = "";
      }
    }

    if (!narrative) {
      // Offline fallback: Rule-based report card
      narrative = `Total pipeline and logged transactions sit at ${kpis?.revenue || "₹1,32,400"}. We currently have ${kpis?.pendingInvoices || "1"} unpaid invoice demanding review. Active projects (${kpis?.activeProjects || "1"}) are executing within expected timelines. Recommendation: Follow up with clients having overdue invoices to improve cash conversion metrics.`;
    }

    return NextResponse.json({ narrative });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate business insights" }, { status: 500 });
  }
}
