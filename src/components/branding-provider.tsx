import React from "react";
import type { BrandingConfig } from "@/server/actions/branding";

interface BrandingProviderProps {
  children: React.ReactNode;
  branding?: BrandingConfig;
}

/**
 * Injects CSS custom-property overrides as an inline <style> tag.
 * Fast, synchronous, and prevents duplicate auth() / database roundtrips.
 */
export function BrandingProvider({ children, branding = {} }: BrandingProviderProps) {
  const cssVars: string[] = [];

  if (branding.primaryColor) {
    cssVars.push(`--primary: ${branding.primaryColor};`);
    cssVars.push(`--ring: ${branding.primaryColor};`);
    cssVars.push(`--sidebar-primary: ${branding.primaryColor};`);
    cssVars.push(`--sidebar-ring: ${branding.primaryColor};`);
    cssVars.push(`--chart-1: ${branding.primaryColor};`);
  }

  const inlineStyle = cssVars.length > 0 ? `:root { ${cssVars.join(" ")} }` : null;

  return (
    <>
      {inlineStyle && <style dangerouslySetInnerHTML={{ __html: inlineStyle }} />}
      {children}
    </>
  );
}

export type { BrandingProviderProps };
