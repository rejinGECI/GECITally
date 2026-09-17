import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CountForm } from "@/components/counting/count-form";
import { RoundCard } from "@/components/counting/round-card";
import type { Candidate, CountRound } from "@/lib/types";

export default async function StaffPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: assignment } = await supabase
    .from("staff_assignments")
    .select("id")
    .eq("staff_id", user?.id ?? "")
    .eq("post_id", postId)
    .maybeSingle();

  if (!assignment) notFound();

  const { data: post } = await supabase.from("posts").select("*").eq("id", postId).single();
  if (!post) notFound();

  const { data: election } = await supabase
    .from("elections")
    .select("*")
    .eq("id", post.election_id)
    .maybeSingle();
  const { data: candidates } = await supabase
    .from("candidates")
    .select("*")
    .eq("post_id", postId)
    .order("display_order");
  const { data: rounds } = await supabase
    .from("count_rounds")
    .select("*")
    .eq("post_id", postId)
    .eq("staff_id", user?.id ?? "")
    .order("round_number", { ascending: false });

  const roundIds = (rounds ?? []).map((round) => round.id);
  const { data: entries } = roundIds.length
    ? await supabase.from("count_entries").select("*").in("round_id", roundIds)
    : { data: [] };

  const pending = (rounds ?? []).find((round) => round.status === "pending_verification") ?? null;
  const rejected = (rounds ?? []).find((round) => round.status === "rejected") ?? null;
  const verifiedCount = (rounds ?? []).filter((round) => round.status === "verified").length;
  const nextRound =
    rejected?.round_number ??
    Math.max(0, ...(rounds ?? []).map((round) => round.round_number), 0) + 1;

  const candidateNames = new Map((candidates ?? []).map((candidate) => [candidate.id, candidate.name]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/staff" className="text-sm text-primary hover:underline">
          Back to assigned posts
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{post.name}</h1>
        <p className="text-muted-foreground">
          {election?.name} · limit {election?.count_limit} verified rounds
        </p>
      </div>
      <CountForm
        postId={postId}
        postName={post.name}
        roundNumber={nextRound}
        candidates={(candidates ?? []) as Candidate[]}
        pendingRound={pending as CountRound | null}
        rejectedRound={rejected as CountRound | null}
        countingOpen={election?.state === "counting"}
        limitReached={verifiedCount >= (election?.count_limit ?? 0)}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {(rounds ?? []).map((round) => (
          <RoundCard
            key={round.id}
            round={round as CountRound}
            entries={(entries ?? [])
              .filter((entry) => entry.round_id === round.id)
              .map((entry) => ({
                ...entry,
                candidate_name: candidateNames.get(entry.candidate_id) ?? "Candidate",
              }))}
          />
        ))}
      </div>
    </div>
  );
}
