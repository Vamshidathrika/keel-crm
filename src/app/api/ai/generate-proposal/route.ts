import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { dealName, clientName, industry } = await req.json();

    const hasGeminiKey = !!process.env.GOOGLE_API_KEY || !!process.env.GEMINI_API_KEY;

    let proposalJson = null;
    if (hasGeminiKey) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const aiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
        const ai = new GoogleGenAI({ apiKey: aiKey });

        const prompt = `Generate a JSON array of 3 line items for a proposal quote. Each item must have: "name" (string), "qty" (number), "price" (number). Client is ${clientName || "Acme"}, deal is '${dealName || "Fleet Upgrade"}', industry is '${industry || "Logistics"}'. Return ONLY the raw JSON array code.`;
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        const clean = (response.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
        proposalJson = JSON.parse(clean);
      } catch (err) {
        proposalJson = null;
      }
    }

    if (!proposalJson || !Array.isArray(proposalJson)) {
      // Offline fallback: Industry-based items
      if (industry === "saas") {
        proposalJson = [
          { name: "Enterprise SaaS User Licenses", qty: 25, price: 1500 },
          { name: "Custom API & SSO Integration Setup", qty: 1, price: 60000 },
          { name: "Platinum 24/7 SLA Support SLA", qty: 12, price: 4500 },
        ];
      } else if (industry === "logistics") {
        proposalJson = [
          { name: "Ocean Freight Transit Container rate", qty: 4, price: 220000 },
          { name: "Customs Clearing Brokerage Charges", qty: 1, price: 35000 },
          { name: "Multimodal Road Inland Delivery", qty: 1, price: 48000 },
        ];
      } else {
        proposalJson = [
          { name: "Standard License Package", qty: 1, price: 50000 },
          { name: "Implementation Consultancy Fee", qty: 20, price: 3500 },
          { name: "Administrative setup", qty: 1, price: 10000 },
        ];
      }
    }

    return NextResponse.json({ items: proposalJson });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate proposal" }, { status: 500 });
  }
}
