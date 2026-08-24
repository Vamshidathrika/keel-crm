"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface QuotesTableProps {
  quotes: any[];
  onStatusUpdate: (id: string, status: "draft" | "sent" | "accepted" | "rejected") => void;
}

export function QuotesTable({ quotes, onStatusUpdate }: QuotesTableProps) {
  if (!quotes || quotes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No quotations found. Click "Create Quote" to generate the first CPQ quote.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider">
          <tr>
            <th className="p-3">Quote ID & Title</th>
            <th className="p-3">Customer</th>
            <th className="p-3">Total Value</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {quotes.map((q) => (
            <tr key={q.id} className="hover:bg-muted/50 transition-colors">
              <td className="p-3 font-medium">
                <div className="font-semibold text-foreground">{q.title}</div>
                <div className="text-[10px] text-muted-foreground font-mono">{q.id}</div>
              </td>
              <td className="p-3 text-muted-foreground">{q.client?.name || "Direct Client"}</td>
              <td className="p-3 font-semibold text-foreground">
                ₹{(q.total || 0).toLocaleString()}
              </td>
              <td className="p-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    q.status === "accepted"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : q.status === "sent"
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-amber-500/10 text-amber-500"
                  }`}
                >
                  {q.status?.toUpperCase() || "DRAFT"}
                </span>
              </td>
              <td className="p-3 text-right space-x-1">
                {q.status !== "accepted" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px]"
                    onClick={() => onStatusUpdate(q.id, "accepted")}
                  >
                    Mark Accepted
                  </Button>
                )}
                {q.status === "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px]"
                    onClick={() => onStatusUpdate(q.id, "sent")}
                  >
                    Mark Sent
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
