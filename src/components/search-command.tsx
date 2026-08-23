"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { globalSearch } from "@/app/actions/search";
import { User, Building2, DollarSign, Search } from "lucide-react";

type SearchResult = {
  contacts: any[];
  companies: any[];
  deals: any[];
};

export default function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ contacts: [], companies: [], deals: [] });

  useEffect(() => {
    const handleToggle = () => setOpen((o) => !o);
    window.addEventListener("toggle-search", handleToggle);
    return () => window.removeEventListener("toggle-search", handleToggle);
  }, []);

  useEffect(() => {
    if (!query) {
      const timer = setTimeout(() => {
        setResults({ contacts: [], companies: [], deals: [] });
      }, 0);
      return () => clearTimeout(timer);
    }

    const delayDebounce = setTimeout(async () => {
      const data = await globalSearch(query);
      setResults(data);
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleSelect = (url: string) => {
    setOpen(false);
    setQuery("");
    router.push(url);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type to search..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {results.deals.length > 0 && (
          <CommandGroup heading="Deals">
            {results.deals.map((d) => (
              <CommandItem
                key={d.id}
                onSelect={() => handleSelect(`/dashboard/deals?id=${d.id}`)}
                className="flex items-center gap-2 cursor-pointer p-2 text-xs"
              >
                <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-medium text-foreground">{d.title}</span>
                <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                  ₹{d.value.toLocaleString("en-IN")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.contacts.length > 0 && (
          <CommandGroup heading="Contacts">
            {results.contacts.map((c) => (
              <CommandItem
                key={c.id}
                onSelect={() => handleSelect(`/dashboard/contacts?id=${c.id}`)}
                className="flex items-center gap-2 cursor-pointer p-2 text-xs"
              >
                <User className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-foreground">
                  {c.firstName} {c.lastName || ""}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {c.email || c.phone || ""}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.companies.length > 0 && (
          <CommandGroup heading="Companies">
            {results.companies.map((co) => (
              <CommandItem
                key={co.id}
                onSelect={() => handleSelect(`/dashboard/companies?id=${co.id}`)}
                className="flex items-center gap-2 cursor-pointer p-2 text-xs"
              >
                <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="font-medium text-foreground">{co.name}</span>
                {co.domain && (
                  <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                    {co.domain}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
