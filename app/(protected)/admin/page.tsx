import { createClient } from "@/lib/supabase/server";
import { ElectionSettings } from "@/components/admin/election-settings";
import { PostEditor } from "@/components/admin/post-editor";
import { StaffManager } from "@/components/admin/staff-manager";
import type { Candidate, Election, Post, Profile } from "@/lib/types";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: election } = await supabase
    .from("elections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: posts } = election
    ? await supabase
        .from("posts")
        .select("*")
        .eq("election_id", election.id)
        .order("display_order")
    : { data: [] as Post[] };

  const postIds = (posts ?? []).map((post) => post.id);
  const { data: candidates } = postIds.length
    ? await supabase.from("candidates").select("*").in("post_id", postIds).order("display_order")
    : { data: [] as Candidate[] };

  const { data: people } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  const { data: assignments } = await supabase.from("staff_assignments").select("*");

  const postsWithCandidates = (posts ?? []).map((post) => ({
    ...post,
    candidates: (candidates ?? []).filter((candidate) => candidate.post_id === post.id),
  }));

  const peopleWithAssignments = ((people ?? []) as Profile[]).map((person) => ({
    ...person,
    assigned_post_ids: (assignments ?? [])
      .filter((assignment) => assignment.staff_id === person.id)
      .map((assignment) => assignment.post_id),
  }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin configuration</h1>
        <p className="mt-1 text-muted-foreground">
          Set up the election, posts, candidates, and counting duty before opening the count.
        </p>
      </div>
      <ElectionSettings election={(election as Election | null) ?? null} />
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Posts and candidates</h2>
        <PostEditor
          electionId={election?.id ?? null}
          posts={postsWithCandidates}
          countingStarted={election?.state !== "setup"}
        />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">People</h2>
        <StaffManager posts={(posts ?? []) as Post[]} people={peopleWithAssignments} />
      </section>
    </div>
  );
}
