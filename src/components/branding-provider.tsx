import { getBrandingConfig } from "@/server/actions/branding";

interface BrandingProviderProps {
  children: React.ReactNode;
}

/**
 * Server component that reads this org's branding config and injects
 * CSS custom-property overrides as an inline <style> tag.
 * This means each organisation can have its own primary colour, app name, etc.
 * without any client-side flash.
 */
export async function BrandingProvider({ children }: BrandingProviderProps) {
  const branding = await getBrandingConfig();

  const cssVars: string[] = [];

  if (branding.primaryColor) {
    cssVars.push(`--primary: ${branding.primaryColor};`);
    cssVars.push(`--ring: ${branding.primaryColor};`);
    cssVars.push(`--sidebar-primary: ${branding.primaryColor};`);
    cssVars.push(`--sidebar-ring: ${branding.primaryColor};`);
    cssVars.push(`--chart-1: ${branding.primaryColor};`);
  }

  const inlineStyle =
    cssVars.length > 0 ? `:root { ${cssVars.join(" ")} }` : null;

  return (
    <>
      {inlineStyle && (
        <style dangerouslySetInnerHTML={{ __html: inlineStyle }} />
      )}
      {children}
    </>
  );
}

export type { BrandingProviderProps };
