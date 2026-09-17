"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { CandidateCard } from "@/components/results/candidate-card";
import { LiveCounter } from "@/components/results/live-counter";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { LivePost } from "@/lib/types";
import { formatNumber, percent } from "@/lib/utils";

export function PostSection({
  post,
  votesPolled,
  countLimit,
  flashKey,
}: {
  post: LivePost;
  votesPolled: number;
  countLimit: number;
  flashKey: number;
}) {
  const ranked = [...post.candidates].sort((a, b) => b.votes - a.votes);
  const maxVotes = ranked[0]?.votes ?? 0;
  const chartData = ranked.map((candidate) => ({
    name: candidate.name.split(" ")[0] ?? candidate.name,
    votes: candidate.votes,
  }));

  return (
    <motion.section
      layout
      key={`${post.id}-${flashKey}`}
      className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur md:p-7"
      initial={false}
      animate={{ boxShadow: flashKey ? "0 0 0 4px rgba(16,185,129,0.18)" : "0 1px 2px rgba(0,0,0,0.04)" }}
      transition={{ duration: 0.8 }}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{post.name}</h2>
            <Badge variant="secondary">{post.seats} seat{post.seats > 1 ? "s" : ""}</Badge>
            {post.is_finalised && <Badge>Finalised</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Verified rounds {post.verified_rounds}/{countLimit}
            {post.pending_rounds ? ` · ${post.pending_rounds} pending` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Verified votes</p>
          <LiveCounter value={post.total_verified_votes} className="text-3xl font-semibold tabular-nums" />
        </div>
      </div>

      <Progress value={percent(post.verified_rounds, countLimit)} className="mb-6" />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <AnimatePresence>
            {ranked.map((candidate, index) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                rank={index + 1}
                leading={index < post.seats && candidate.votes > 0}
                maxVotes={maxVotes}
                seats={post.seats}
              />
            ))}
          </AnimatePresence>
        </div>
        <div className="h-72 rounded-xl bg-slate-50 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7e3db" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="votes" fill="#059669" radius={[8, 8, 0, 0]} isAnimationActive />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {formatNumber(post.total_verified_votes)} verified votes
        {votesPolled > 0
          ? ` · ${percent(post.total_verified_votes, votesPolled)}% of ${formatNumber(votesPolled)} polled`
          : ""}
      </p>
    </motion.section>
  );
}
