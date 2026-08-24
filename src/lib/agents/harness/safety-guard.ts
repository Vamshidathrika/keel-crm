/**
 * Autonomous AI Agent Security Guard:
 * Prompt Injection Detection, Jailbreak Screening, and Input Sanitization.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /system\s+override/i,
  /you\s+are\s+now\s+(DAN|unrestricted|jailbroken)/i,
  /disregard\s+(the\s+)?(safety|system|initial)\s+(rules|guidelines)/i,
  /reveal\s+(the\s+)?(system\s+prompt|hidden\s+instructions|api\s+keys)/i,
  /dump\s+(all\s+)?(tenant|organization|database)\s+data/i,
  /exfiltrate/i,
  /output\s+all\s+records\s+from\s+all\s+orgs/i,
];

export interface SafetyCheckResult {
  isSafe: boolean;
  sanitizedPrompt: string;
  threatDetected?: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

/**
 * Screen input prompt against adversarial attacks and prompt injection patterns.
 */
export function sanitizeAndInspectPrompt(rawPrompt: string): SafetyCheckResult {
  if (!rawPrompt || typeof rawPrompt !== "string") {
    return {
      isSafe: true,
      sanitizedPrompt: "",
      riskLevel: "low",
    };
  }

  // 1. Clamp prompt length to prevent token-exhaustion denial of service
  const MAX_PROMPT_LENGTH = 1200;
  let sanitized = rawPrompt.trim().slice(0, MAX_PROMPT_LENGTH);

  // 2. Scan against known injection & exfiltration patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      return {
        isSafe: false,
        sanitizedPrompt: sanitized,
        threatDetected: `Adversarial prompt injection pattern detected: ${pattern.toString()}`,
        riskLevel: "critical",
      };
    }
  }

  // 3. Remove dangerous unprintable / null byte characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return {
    isSafe: true,
    sanitizedPrompt: sanitized,
    riskLevel: "low",
  };
}
