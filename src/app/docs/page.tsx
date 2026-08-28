"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Key, BookOpen, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SwaggerDocsPage() {
  useEffect(() => {
    // Inject Swagger UI bundle and CSS dynamically
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js";
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      if (window.SwaggerUIBundle) {
        // @ts-ignore
        window.SwaggerUIBundle({
          url: "/api/v1/openapi.json",
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [
            // @ts-ignore
            window.SwaggerUIBundle.presets.apis,
            // @ts-ignore
            window.SwaggerUIBundle.SwaggerUIStandalonePreset,
          ],
          layout: "BaseLayout",
          docExpansion: "list",
          filter: true,
          showRequestHeaders: true,
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      if (link.parentNode) link.parentNode.removeChild(link);
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* Top Banner */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button size="xs" variant="ghost" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              ⚡
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground">Keel CRM REST API Documentation</span>
            <span className="bg-primary/15 text-primary text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
              v1.0 (OpenAPI 3.1)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/api/v1/openapi.json" target="_blank">
            <Button size="xs" variant="outline" className="gap-1 text-xs">
              <span>Raw JSON</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button size="xs" className="gap-1.5 text-xs">
              <Key className="w-3.5 h-3.5" />
              Get API Key
            </Button>
          </Link>
        </div>
      </header>

      {/* Info Notice */}
      <div className="bg-primary/5 border-b border-primary/10 px-6 py-2.5 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span>
            <strong>Authentication:</strong> All endpoints require a Bearer API key. Click <strong>Authorize</strong> in Swagger below and enter <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">keel_sk_...</code>
          </span>
        </div>
        <span className="font-mono text-[11px]">Base URL: /api/v1</span>
      </div>

      {/* Swagger UI Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        <div className="bg-card border border-border rounded-xl p-4 md:p-6 shadow-sm overflow-hidden min-h-[700px]">
          <div id="swagger-ui" className="swagger-ui-custom" />
        </div>
      </main>

      <style jsx global>{`
        .swagger-ui .topbar {
          display: none !important;
        }
        .swagger-ui .info {
          margin: 10px 0 20px 0 !important;
        }
        .swagger-ui .info .title {
          color: inherit !important;
          font-size: 24px !important;
        }
        .swagger-ui .scheme-container {
          background: transparent !important;
          box-shadow: none !important;
          padding: 10px 0 !important;
          border-bottom: 1px solid var(--border, #e5e7eb) !important;
          margin-bottom: 20px !important;
        }
        .swagger-ui .btn.authorize {
          background-color: #2F5DFF !important;
          color: white !important;
          border-color: #2F5DFF !important;
          border-radius: 6px !important;
        }
        .swagger-ui .btn.authorize svg {
          fill: white !important;
        }
        .swagger-ui .opblock {
          border-radius: 8px !important;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
          margin-bottom: 12px !important;
        }
      `}</style>
    </div>
  );
}
