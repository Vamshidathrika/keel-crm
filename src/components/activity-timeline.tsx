"use client";

import React, { useState, useEffect } from "react";
import {
  Phone,
  Mail,
  MessageSquare,
  StickyNote,
  GitBranch,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getActivities } from "@/app/actions/activities";

type Activity = {
  id: string;
  type: string;
  body: string;
  metadata: Record<string, any>;
  occurredAt: string;
  actorUserId?: {
    name: string;
  } | null;
};

interface ActivityTimelineProps {
  contactId?: string;
  companyId?: string;
  dealId?: string;
  refreshTrigger?: number;
}

const activityIcons: Record<string, React.ComponentType<any>> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  note: StickyNote,
  stage_change: GitBranch,
  task: CheckCircle2,
  ai: Sparkles,
  system: Info,
};

function formatTimeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function ActivityTimeline({
  contactId,
  companyId,
  dealId,
  refreshTrigger = 0,
}: ActivityTimelineProps) {
  const [list, setList] = useState<Activity[]>([]);
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<string, boolean>>({});

  const fetchTimeline = async () => {
    const data = await getActivities({ contactId, companyId, dealId });
    setList(data as Activity[]);
  };

  useEffect(() => {
    fetchTimeline();
  }, [contactId, companyId, dealId, refreshTrigger]);

  const toggleTranscript = (id: string) => {
    setExpandedTranscripts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (list.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        No activity logs on record.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border space-y-4">
        {list.map((act) => {
          const IconComponent = activityIcons[act.type] || Info;
          const isAI = act.type === "ai";
          const hasTranscript = !!act.metadata?.transcript;

          return (
            <div key={act.id} className="relative group">
              {/* Timeline Icon Node */}
              <span
                className={`absolute -left-[23px] top-1 flex h-6 w-6 items-center justify-center rounded-full border bg-background transition-transform duration-200 group-hover:scale-105 ${
                  isAI
                    ? "border-ai/30 text-ai bg-ai/10 shadow-sm shadow-ai/10"
                    : "border-border text-muted-foreground"
                }`}
              >
                <IconComponent className="h-3 h-3" />
              </span>

              {/* Activity Card */}
              <div
                className={`p-3 rounded-lg border text-xs leading-relaxed transition-all ${
                  isAI
                    ? "border-ai/30 bg-ai/5 shadow-sm shadow-ai/5"
                    : "border-border bg-card hover:border-border-hover"
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className={`font-semibold ${isAI ? "text-ai" : "text-foreground"}`}>
                    {isAI ? "AI Agent Insight" : act.type.replace("_", " ")}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(act.occurredAt)}</span>
                  </div>
                </div>

                <p className="text-muted-foreground">{act.body}</p>

                {/* Call Metadata (Outcome, Duration) */}
                {act.type === "call" && act.metadata && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground font-mono bg-muted/50 p-1.5 rounded border border-border/50">
                    {act.metadata.outcome && (
                      <span>Outcome: <strong className="text-foreground capitalize">{act.metadata.outcome}</strong></span>
                    )}
                    {act.metadata.duration !== undefined && (
                      <span>Duration: <strong className="text-foreground">{act.metadata.duration}s</strong></span>
                    )}
                  </div>
                )}

                {/* Collapsible Transcript Section */}
                {hasTranscript && (
                  <div className="mt-2 border-t border-border/50 pt-2">
                    <button
                      onClick={() => toggleTranscript(act.id)}
                      className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline transition-all"
                    >
                      {expandedTranscripts[act.id] ? (
                        <>
                          <ChevronUp className="w-3 h-3" /> Hide call playback
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" /> Play call playback
                        </>
                      )}
                    </button>
                    {expandedTranscripts[act.id] && (
                      <CallPlayer transcript={act.metadata.transcript} />
                    )}
                  </div>
                )}

                {/* Actor Attribution */}
                {act.actorUserId && (
                  <div className="mt-1.5 text-[9px] text-muted-foreground/75 text-right font-mono">
                    Logged by {act.actorUserId.name}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Interactive Simulated Transcript Player
function CallPlayer({ transcript }: { transcript: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const segments = React.useMemo(() => parseTranscript(transcript), [transcript]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            setActiveSegmentIndex(segments.length - 1);
            return 100;
          }
          const nextVal = prev + 5;
          const segmentCount = segments.length;
          const activeIndex = Math.min(Math.floor((nextVal / 100) * segmentCount), segmentCount - 1);
          setActiveSegmentIndex(activeIndex);
          return nextVal;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, segments]);

  useEffect(() => {
    if (activeSegmentIndex >= 0 && containerRef.current) {
      const activeEl = containerRef.current.children[activeSegmentIndex] as HTMLElement;
      if (activeEl) {
        containerRef.current.scrollTo({
          top: activeEl.offsetTop - 20,
          behavior: "smooth",
        });
      }
    }
  }, [activeSegmentIndex]);

  const handlePlayToggle = () => {
    if (progress >= 100) {
      setProgress(0);
      setActiveSegmentIndex(-1);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="mt-2.5 p-3 rounded-lg border border-border bg-muted/30 space-y-3">
      {/* Player Header Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlayToggle}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary hover:bg-primary/95 text-primary-foreground shadow cursor-pointer transition-transform duration-200 active:scale-95 outline-none border-none"
        >
          {isPlaying ? (
            <span className="flex items-center gap-0.5 justify-center">
              <span className="w-1 h-3 bg-current rounded-sm"></span>
              <span className="w-1 h-3 bg-current rounded-sm"></span>
            </span>
          ) : (
            <span className="ml-0.5 border-y-[5px] border-y-transparent border-l-[8px] border-l-current"></span>
          )}
        </button>

        {/* Custom Progress Bar */}
        <div className="flex-1 flex items-center gap-2 text-[9px] font-mono text-muted-foreground">
          <span>00:{(Math.floor((progress / 100) * segments.length * 3) % 60).toString().padStart(2, "0")}</span>
          <div className="flex-1 h-1.5 rounded bg-muted border border-border relative overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span>00:{(segments.length * 3).toString().padStart(2, "0")}</span>
        </div>
      </div>

      {/* Bubble Chat Logs Container */}
      <div
        ref={containerRef}
        className="max-h-48 overflow-y-auto pr-1 space-y-3 scrollbar-thin transition-all flex flex-col"
      >
        {segments.map((seg, idx) => {
          const isAgent = seg.speaker === "agent";
          const isActive = idx === activeSegmentIndex;
          const isRevealed = idx <= activeSegmentIndex || !isPlaying;

          if (!isRevealed) return null;

          return (
            <div
              key={idx}
              className={`flex flex-col space-y-1 transition-all duration-300 ${
                isAgent ? "items-start" : "items-end"
              }`}
            >
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/80 font-mono px-1">
                <span>{isAgent ? "Rep (Agent)" : "Customer"}</span>
                <span>•</span>
                <span>{seg.timestamp}</span>
                {seg.sentiment === "positive" && (
                  <span className="text-[7px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1 rounded-sm uppercase tracking-wider font-semibold">
                    Positive
                  </span>
                )}
              </div>
              <div
                className={`max-w-[85%] p-2 rounded-lg border text-[11px] leading-relaxed transition-all shadow-sm ${
                  isAgent
                    ? "bg-card border-border rounded-tl-none text-left text-foreground"
                    : "bg-ai/5 border-ai/30 text-foreground rounded-tr-none text-right"
                } ${isActive ? "ring-2 ring-primary/45 border-primary/50" : ""}`}
              >
                {seg.message}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseTranscript(text: string): Array<{ speaker: "agent" | "customer"; message: string; timestamp: string; sentiment: "positive" | "neutral" | "negative" }> {
  const regex = /(Agent|Customer|User|Caller):\s*([\s\S]*?)(?=(Agent|Customer|User|Caller):|$)/gi;
  const matches = [...text.matchAll(regex)];
  
  if (matches.length > 0) {
    return matches.map((m, idx) => {
      const sp = m[1].toLowerCase();
      const speaker = (sp === "agent" || sp === "user") ? "agent" : "customer";
      const message = m[2].trim();
      const sentiments: Array<"positive" | "neutral"> = ["positive", "neutral"];
      const sentiment = message.match(/interest|yes|great|deal|proposal/i) ? "positive" : sentiments[idx % 2];
      return {
        speaker,
        message,
        timestamp: `00:${(idx * 5).toString().padStart(2, "0")}`,
        sentiment
      };
    });
  }
  
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.map((s, idx) => {
    const speaker = idx % 2 === 0 ? "agent" : "customer";
    const sentiments: Array<"positive" | "neutral"> = ["positive", "neutral"];
    const sentiment = s.match(/interest|yes|great|deal|proposal/i) ? "positive" : sentiments[idx % 2];
    return {
      speaker,
      message: s.trim(),
      timestamp: `00:${(idx * 4).toString().padStart(2, "0")}`,
      sentiment
    };
  });
}
