// Utility to enrich company name, favicon, and likely business vertical from email addresses

const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "mail.com",
  "gmx.com",
  "yandex.com",
]);

export interface EnrichedDomainInfo {
  isBusinessDomain: boolean;
  domain: string;
  suggestedOrgName: string;
  suggestedSlug: string;
  faviconUrl: string | null;
  suggestedVerticalKey: string | null;
}

export function enrichDomainFromEmail(email: string): EnrichedDomainInfo | null {
  if (!email || !email.includes("@")) return null;
  
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return null;

  const domain = parts[1].trim();
  if (!domain || !domain.includes(".") || domain.length < 4) return null;

  if (GENERIC_EMAIL_DOMAINS.has(domain)) {
    return {
      isBusinessDomain: false,
      domain,
      suggestedOrgName: "",
      suggestedSlug: "",
      faviconUrl: null,
      suggestedVerticalKey: null,
    };
  }

  // Extract company name from domain (e.g., 'skyline-freight.co.uk' -> 'Skyline Freight')
  const host = domain.split(".")[0];
  const cleanedName = host
    .split(/[-_.]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const slug = host.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  // Keyword heuristic to infer vertical
  let suggestedVerticalKey: string | null = null;
  const dLower = domain.toLowerCase();
  if (dLower.includes("freight") || dLower.includes("logistics") || dLower.includes("cargo") || dLower.includes("shipping") || dLower.includes("transport")) {
    suggestedVerticalKey = "logistics";
  } else if (dLower.includes("health") || dLower.includes("care") || dLower.includes("clinic") || dLower.includes("med") || dLower.includes("pharma") || dLower.includes("hospital")) {
    suggestedVerticalKey = "healthcare";
  } else if (dLower.includes("realt") || dLower.includes("prop") || dLower.includes("estate") || dLower.includes("housing")) {
    suggestedVerticalKey = "real_estate";
  } else if (dLower.includes("saas") || dLower.includes("tech") || dLower.includes("cloud") || dLower.includes("soft") || dLower.includes("app") || dLower.includes("ai") || dLower.includes("io")) {
    suggestedVerticalKey = "saas";
  } else if (dLower.includes("fin") || dLower.includes("capital") || dLower.includes("invest") || dLower.includes("wealth") || dLower.includes("bank") || dLower.includes("pay")) {
    suggestedVerticalKey = "finance";
  } else if (dLower.includes("shop") || dLower.includes("store") || dLower.includes("retail") || dLower.includes("market") || dLower.includes("commerce")) {
    suggestedVerticalKey = "ecommerce";
  } else if (dLower.includes("consult") || dLower.includes("agency") || dLower.includes("advis") || dLower.includes("law") || dLower.includes("partner")) {
    suggestedVerticalKey = "consulting";
  } else if (dLower.includes("mfg") || dLower.includes("factory") || dLower.includes("ind") || dLower.includes("steel") || dLower.includes("make")) {
    suggestedVerticalKey = "manufacturing";
  }

  return {
    isBusinessDomain: true,
    domain,
    suggestedOrgName: cleanedName,
    suggestedSlug: slug,
    faviconUrl,
    suggestedVerticalKey,
  };
}
