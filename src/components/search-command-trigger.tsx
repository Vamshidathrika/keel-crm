"use client";

import React, { useEffect } from "react";
import { Search } from "lucide-react";

export default function SearchCommandTrigger() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-search"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("toggle-search"));
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 w-full max-w-sm px-3 py-1.5 text-xs text-muted-foreground bg-muted hover:bg-muted/80 border border-border rounded-md transition-colors text-left"
    >
      <Search className="w-3.5 h-3.5" />
      <span>Search deals, contacts, companies...</span>
      <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[9px] font-medium opacity-100">
        <span className="text-[10px]">⌘</span>K
      </kbd>
    </button>
  );
}
