"use client";

import { motion } from "framer-motion";
import { LiveCounter } from "@/components/results/live-counter";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import type { LiveCandidate } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CandidateCard({
  candidate,
  rank,
  leading,
  maxVotes,
  seats,
}: {
  candidate: LiveCandidate;
  rank: number;
  leading: boolean;
  maxVotes: number;
  seats: number;
}) {
  const width = maxVotes > 0 ? (candidate.votes / maxVotes) * 100 : 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border bg-white/90 p-4 shadow-sm",
        leading && "border-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]",
      )}
    >
      <div className="flex items-start gap-3">
        {candidate.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.photo_url}
            alt=""
            className="size-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
            {initials(candidate.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{candidate.name}</h3>
            {leading && <Badge>Leading · Top {seats}</Badge>}
            <span className="text-xs text-muted-foreground">#{rank}</span>
          </div>
          {candidate.panel_name && (
            <p className="text-xs text-muted-foreground">{candidate.panel_name}</p>
          )}
        </div>
        <LiveCounter value={candidate.votes} className="text-2xl font-semibold tabular-nums text-emerald-800" />
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className={cn("h-full rounded-full", leading ? "bg-emerald-500" : "bg-slate-400")}
          initial={false}
          animate={{ width: `${width}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        />
      </div>
    </motion.article>
  );
}
