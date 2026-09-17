import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { percent } from "@/lib/utils";

type AssignedPost = { id: string; name: string; seats: number };

export default async function StaffHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: election } = await supabase
    .from("elections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: assignments } = await supabase
    .from("staff_assignments")
    .select("post_id")
    .eq("staff_id", user?.id ?? "");

  const postIds = (assignments ?? []).map((row) => row.post_id);
  const { data: posts } = postIds.length
    ? await supabase.from("posts").select("id, name, seats").in("id", postIds)
    : { data: [] as AssignedPost[] };

  const { data: rounds } = postIds.length
    ? await supabase
        .from("count_rounds")
        .select("*")
        .in("post_id", postIds)
        .eq("staff_id", user?.id ?? "")
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Counting duty</h1>
        <p className="mt-1 text-muted-foreground">
          {election ? `${election.name} · state: ${election.state}` : "No election configured."}
        </p>
      </div>
      {(posts ?? []).length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          You have not been assigned a post yet. Ask the election admin.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(posts ?? []).map((post) => {
            const postRounds = (rounds ?? []).filter((round) => round.post_id === post.id);
            const pending = postRounds.find((round) => round.status === "pending_verification");
            const rejected = postRounds.find((round) => round.status === "rejected");
            const verified = postRounds.filter((round) => round.status === "verified").length;
            return (
              <Link key={post.id} href={`/staff/${post.id}`}>
                <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      {post.name}
                      {pending && <Badge variant="warning">Awaiting verification</Badge>}
                      {rejected && !pending && <Badge variant="destructive">Rejected</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {post.seats} seat{post.seats > 1 ? "s" : ""}
                    </p>
                    <Progress value={percent(verified, election?.count_limit ?? 1)} />
                    <p className="text-xs text-muted-foreground">
                      {verified}/{election?.count_limit ?? 0} verified rounds
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
