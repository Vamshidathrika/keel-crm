"use client";

import React, { useState, useEffect } from "react";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startProductTour } from "./product-tour";

export default function TourTrigger() {
  const [isTourCompleted, setIsTourCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const completed = localStorage.getItem("keel_tour_completed");
      setIsTourCompleted(completed === "true");
    } catch (_e) {
      setIsTourCompleted(false);
    }

    const handleStatusChange = (e: any) => {
      if (e?.detail?.completed !== undefined) {
        setIsTourCompleted(e.detail.completed);
      } else {
        try {
          const completed = localStorage.getItem("keel_tour_completed");
          setIsTourCompleted(completed === "true");
        } catch (_e) {}
      }
    };

    window.addEventListener("keel-tour-status-change", handleStatusChange);
    return () => window.removeEventListener("keel-tour-status-change", handleStatusChange);
  }, []);

  // If tour has been completed or dismissed, completely remove the button from UI as requested
  if (isTourCompleted === true || isTourCompleted === null) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={startProductTour}
      className="h-8 gap-1.5 text-xs font-semibold text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all shadow-xs animate-pulse"
      title="Start Interactive Platform Tour"
    >
      <Compass className="w-3.5 h-3.5 text-primary" />
      <span className="inline">Take Platform Tour</span>
    </Button>
  );
}
