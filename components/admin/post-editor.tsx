"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteCandidate, deletePost, saveCandidate, savePost } from "@/lib/actions/admin";
import type { Candidate, Post } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useAntiDuplicate } from "@/hooks/use-anti-duplicate";

type PostWithCandidates = Post & { candidates: Candidate[] };

export function PostEditor({
  electionId,
  posts,
  countingStarted,
}: {
  electionId: string | null;
  posts: PostWithCandidates[];
  countingStarted: boolean;
}) {
  const { isSubmitting, run } = useAntiDuplicate();

  if (!electionId) {
    return <p className="text-sm text-muted-foreground">Save election metadata first.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add post</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              void run(async () => {
                const result = await savePost(new FormData(form));
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Post saved.");
                  form.reset();
                }
              });
            }}
          >
            <input type="hidden" name="election_id" value={electionId} />
            <div className="space-y-2">
              <Label htmlFor="post-name">Post name</Label>
              <Input id="post-name" name="name" placeholder="Chairman" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seats">Seats</Label>
              <Input id="seats" name="seats" type="number" min={1} defaultValue={1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_order">Order</Label>
              <Input id="display_order" name="display_order" type="number" defaultValue={posts.length + 1} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {posts.map((post) => (
        <PostCard key={post.id} post={post} countingStarted={countingStarted} />
      ))}
    </div>
  );
}

function PostCard({ post, countingStarted }: { post: PostWithCandidates; countingStarted: boolean }) {
  const { isSubmitting, run } = useAntiDuplicate();
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            {post.name}
            <Badge variant="secondary">{post.seats} seat{post.seats > 1 ? "s" : ""}</Badge>
          </CardTitle>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={countingStarted || busyId === post.id}
          onClick={() => {
            if (!window.confirm(`Delete ${post.name}?`)) return;
            setBusyId(post.id);
            void deletePost(post.id).then((result) => {
              setBusyId(null);
              if (result.error) toast.error(result.error);
              else toast.success("Post deleted.");
            });
          }}
        >
          Delete post
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          {post.candidates.map((candidate) => (
            <li key={candidate.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
              <div>
                <p className="font-medium">{candidate.name}</p>
                <p className="text-xs text-muted-foreground">{candidate.panel_name || "Independent"}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={countingStarted}
                onClick={() => {
                  void deleteCandidate(candidate.id).then((result) => {
                    if (result.error) toast.error(result.error);
                    else toast.success("Candidate removed.");
                  });
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="grid gap-3 md:grid-cols-[1.4fr_1fr_1.4fr_auto] md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            void run(async () => {
              const result = await saveCandidate(new FormData(form));
              if (result.error) toast.error(result.error);
              else {
                toast.success("Candidate added.");
                form.reset();
              }
            });
          }}
        >
          <input type="hidden" name="post_id" value={post.id} />
          <input type="hidden" name="display_order" value={post.candidates.length + 1} />
          <div className="space-y-2">
            <Label>Candidate</Label>
            <Input name="name" placeholder="Full name" required />
          </div>
          <div className="space-y-2">
            <Label>Panel</Label>
            <Input name="panel_name" placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label>Photo URL</Label>
            <Input name="photo_url" placeholder="https://..." />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
