"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80"
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center cursor-pointer outline-none border border-transparent hover:border-border"
        aria-label="Toggle theme"
        title={`Theme: ${theme || "system"} (Click to change)`}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-primary transition-all rotate-0 scale-100" />
        ) : (
          <Sun className="h-4 w-4 text-primary transition-all rotate-0 scale-100" />
        )}
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32 bg-popover border-border shadow-lg">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`flex items-center gap-2 cursor-pointer text-xs ${
            theme === "light" ? "font-bold text-primary bg-primary/10" : ""
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-2 cursor-pointer text-xs ${
            theme === "dark" ? "font-bold text-primary bg-primary/10" : ""
          }`}
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`flex items-center gap-2 cursor-pointer text-xs ${
            theme === "system" ? "font-bold text-primary bg-primary/10" : ""
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
