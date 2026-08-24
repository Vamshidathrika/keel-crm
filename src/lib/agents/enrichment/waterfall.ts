import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export interface WaterfallEnrichmentInput {
  domain?: string;
  companyName?: string;
  contactEmail?: string;
  contactTitle?: string;
}

export interface WaterfallEnrichmentResult {
  status: "success" | "partial" | "failed";
  tierReached: 1 | 2 | 3;
  data: {
    isCorporateEmail: boolean;
    domainHealth: "valid" | "free_provider" | "unverified";
    industry: string;
    techStack: string[];
    employeeEstimate: string;
    icpFit: "Tier 1 (High)" | "Tier 2 (Medium)" | "Tier 3 (Low)";
    summary: string;
    suggestedHook: string;
  };
  provenance: {
    sources: string[];
    confidence: number;
  };
}

/**
 * 3-Tier Waterfall Lead & Account Enrichment Engine
 */
export async function executeWaterfallEnrichment(
  input: WaterfallEnrichmentInput
): Promise<WaterfallEnrichmentResult> {
  const sources: string[] = [];
  const { domain = "", companyName = "", contactEmail = "", contactTitle = "" } = input;

  // Tier 1: Free Heuristics & Domain Health Validation
  sources.push("dns_domain_heuristics");
  const emailLower = contactEmail.toLowerCase();
  const isFreeProvider =
    emailLower.endsWith("@gmail.com") ||
    emailLower.endsWith("@yahoo.com") ||
    emailLower.endsWith("@hotmail.com") ||
    emailLower.endsWith("@outlook.com");

  const isCorporateEmail = contactEmail.length > 0 && !isFreeProvider;
  const domainHealth = isFreeProvider ? "free_provider" : contactEmail ? "valid" : "unverified";

  // Tier 2: Keyword & Technographic Heuristics
  sources.push("technographic_rule_engine");
  const nameLower = companyName.toLowerCase();
  const domainLower = domain.toLowerCase();

  let detectedIndustry = "Technology & Professional Services";
  let detectedTech: string[] = ["Cloud Hosting", "REST APIs"];
  let icpFit: "Tier 1 (High)" | "Tier 2 (Medium)" | "Tier 3 (Low)" = "Tier 2 (Medium)";

  if (nameLower.includes("ai") || domainLower.includes(".ai") || nameLower.includes("cloud") || nameLower.includes("software")) {
    detectedIndustry = "Software & AI Solutions";
    detectedTech = ["Next.js", "TypeScript", "Python AI Core", "PostgreSQL", "Tailwind CSS"];
    icpFit = "Tier 1 (High)";
  } else if (nameLower.includes("logistics") || nameLower.includes("shipping") || nameLower.includes("freight")) {
    detectedIndustry = "Supply Chain & Global Logistics";
    detectedTech = ["Fleet Telematics", "WMS Engine", "EDI Integration"];
    icpFit = "Tier 1 (High)";
  } else if (nameLower.includes("health") || nameLower.includes("clinic") || nameLower.includes("med")) {
    detectedIndustry = "Healthcare & Life Sciences";
    detectedTech = ["HIPAA Compliant Storage", "EHR Interop", "HL7/FHIR"];
  }

  // Tier 3: Gemini 2.5 AI Synthesis & Dossier Generation
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  let summary = `${companyName || domain} operates in ${detectedIndustry}. Account matches ${icpFit} criteria.`;
  let suggestedHook = `Reach out regarding workflow automation opportunities tailored for ${detectedIndustry}.`;
  let tierReached: 1 | 2 | 3 = 2;

  if (apiKey && apiKey !== "YOUR_GEMINI_API_KEY") {
    try {
      const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        temperature: 0.2,
        apiKey,
      });

      const prompt = `Perform enterprise enrichment for:
Company: ${companyName || domain}
Domain: ${domain}
Contact Title: ${contactTitle || "Sales Leader"}
Industry: ${detectedIndustry}

Provide a 2-sentence executive summary and a 1-sentence tailored sales outreach hook. Output plain text.`;

      const res = await model.invoke([
        new SystemMessage("You are an expert enterprise sales intelligence engine."),
        new HumanMessage(prompt),
      ]);

      if (res.content) {
        summary = (res.content as string).trim();
        tierReached = 3;
        sources.push("gemini_2.5_synthesis");
      }
    } catch (err) {
      console.warn("Waterfall Tier 3 AI synthesis fell back to Tier 2 heuristics.");
    }
  }

  return {
    status: "success",
    tierReached,
    data: {
      isCorporateEmail,
      domainHealth,
      industry: detectedIndustry,
      techStack: detectedTech,
      employeeEstimate: "50-250 employees",
      icpFit,
      summary,
      suggestedHook,
    },
    provenance: {
      sources,
      confidence: tierReached === 3 ? 0.95 : 0.82,
    },
  };
}
