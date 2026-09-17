"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRealtimeResults } from "@/hooks/use-realtime-results";
import { PostSection } from "@/components/results/post-section";
import { LiveCounter } from "@/components/results/live-counter";
import { BrandLockup } from "@/components/branding/geci-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatNumber, percent } from "@/lib/utils";
import { cn } from "@/lib/utils";

const BIG_SCREEN_KEY = "geci-big-screen";
const bigScreenListeners = new Set<() => void>();

function emitBigScreen() {
  bigScreenListeners.forEach((listener) => listener());
}

function subscribeBigScreen(listener: () => void) {
  bigScreenListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    bigScreenListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getBigScreenSnapshot() {
  return window.localStorage.getItem(BIG_SCREEN_KEY) === "1";
}

function getBigScreenServerSnapshot() {
  return false;
}

function setBigScreenMode(value: boolean) {
  window.localStorage.setItem(BIG_SCREEN_KEY, value ? "1" : "0");
  document.documentElement.classList.toggle("big-screen", value);
  emitBigScreen();
}

export function ResultsBoard() {
  const { data, error, loading, flashKey } = useRealtimeResults();
  const bigScreen = useSyncExternalStore(
    subscribeBigScreen,
    getBigScreenSnapshot,
    getBigScreenServerSnapshot,
  );

  useEffect(() => {
    document.documentElement.classList.toggle("big-screen", bigScreen);
  }, [bigScreen]);

  const election = data?.election ?? null;
  const posts = useMemo(() => data?.posts ?? [], [data?.posts]);
  const progress = useMemo(() => {
    if (!election || !posts.length) return 0;
    const verified = posts.reduce(
      (sum, post) => sum + Math.min(post.verified_rounds, election.count_limit),
      0,
    );
    return percent(verified, posts.length * election.count_limit);
  }, [election, posts]);
  const totalVotes = posts.reduce((sum, post) => sum + post.total_verified_votes, 0);

  if (loading) {
    return <p className="py-24 text-center text-muted-foreground">Loading live results…</p>;
  }

  if (error) {
    return (
      <p className="mx-auto max-w-xl rounded-xl bg-red-50 p-6 text-center text-red-800">
        {error}. Confirm the Supabase URL/keys and that the schema migration has been applied.
      </p>
    );
  }

  if (!election) {
    return (
      <p className="py-24 text-center text-muted-foreground">
        No election has been configured yet.
      </p>
    );
  }

  return (
    <div className={cn("min-h-screen bg-[radial-gradient(circle_at_top,_#d1fae5,_#f8fafc_42%)]", bigScreen && "big-screen")}>
      <header className="border-b border-emerald-900/10 bg-emerald-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <BrandLockup light />
          <Button
            type="button"
            variant={bigScreen ? "secondary" : "outline"}
            className={cn(!bigScreen && "border-white/30 bg-transparent text-white hover:bg-white/10")}
            onClick={() => setBigScreenMode(!bigScreen)}
          >
            {bigScreen ? "Exit big screen" : "Big screen mode"}
          </Button>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">Live counting</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-5xl">{election.name}</h1>
              <p className="mt-2 text-emerald-100">
                {formatDate(election.date)} · Government Engineering College Idukki
              </p>
            </div>
            <div className="flex flex-wrap gap-6">
              <Stat label="Votes polled" value={election.total_votes_polled} />
              <Stat label="Verified votes" value={totalVotes} />
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-200">Status</p>
                <Badge className="mt-2 capitalize">{election.state}</Badge>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm text-emerald-100">
              <span>Counting progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-3 bg-emerald-900" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        {posts.map((post) => (
          <PostSection
            key={post.id}
            post={post}
            votesPolled={election.total_votes_polled}
            countLimit={election.count_limit}
            flashKey={flashKey}
          />
        ))}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-emerald-200">{label}</p>
      <LiveCounter value={value} className="text-3xl font-semibold tabular-nums" />
      <p className="sr-only">{formatNumber(value)}</p>
    </div>
  );
}
