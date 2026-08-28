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

  const isValidColor = (c?: string): boolean => {
    if (!c) return false;
    const trimmed = c.trim();
    // Allow hex (#fff, #ffffff, #ffffffff), rgb/rgba, hsl/hsla, or safe alphanumeric CSS color names
    return /^#([0-9a-fA-F]{3,8})$|^rgb[a]?\([^)]+\)$|^hsl[a]?\([^)]+\)$|^[a-zA-Z]{3,20}$/.test(trimmed);
  };

  if (branding.primaryColor && isValidColor(branding.primaryColor)) {
    const safeColor = branding.primaryColor.trim();
    cssVars.push(`--primary: ${safeColor};`);
    cssVars.push(`--ring: ${safeColor};`);
    cssVars.push(`--sidebar-primary: ${safeColor};`);
    cssVars.push(`--sidebar-ring: ${safeColor};`);
    cssVars.push(`--chart-1: ${safeColor};`);
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
