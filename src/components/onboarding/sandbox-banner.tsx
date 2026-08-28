"use client";

import React, { useState, useTransition } from "react";
import { Sparkles, Trash2, UploadCloud, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSandboxDemoData } from "@/server/actions/sandbox-seed";
import Link from "next/link";

interface SandboxBannerProps {
  businessType?: string | null;
  hasDemoData?: boolean;
}

export default function SandboxBanner({ businessType, hasDemoData = true }: SandboxBannerProps) {
  const [visible, setVisible] = useState(hasDemoData);
  const [isPending, startTransition] = useTransition();

  if (!visible) return null;

  const handleClear = () => {
    startTransition(async () => {
      try {
        await clearSandboxDemoData();
        setVisible(false);
      } catch (err) {
        console.error("Failed to clear demo data", err);
      }
    });
  };

  const formattedType = businessType
    ? businessType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : "CRM";

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-3.5 sm:p-4 shadow-sm mb-6 transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Interactive Sandbox Active
              </span>
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
                {formattedType} Pre-loaded
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Explore pre-populated deals, companies, and AI lead scores. Real data can be imported anytime.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Link href="/dashboard/contacts" className="inline-block">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-medium border-primary/30 hover:bg-primary/10">
              <UploadCloud className="h-3.5 w-3.5 text-primary" />
              Import CSV
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            disabled={isPending}
            className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Clear Demo Data
          </Button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-1"
            title="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
