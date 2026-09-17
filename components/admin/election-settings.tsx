"use client";

import { useState } from "react";
import { toast } from "sonner";
import { resetElectionCounts, setElectionState, upsertElection } from "@/lib/actions/admin";
import type { Election, ElectionState } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAntiDuplicate } from "@/hooks/use-anti-duplicate";

const STATES: ElectionState[] = ["setup", "counting", "finalised"];

export function ElectionSettings({ election }: { election: Election | null }) {
  const { isSubmitting, run } = useAntiDuplicate();
  const { isSubmitting: stateBusy, run: runState } = useAntiDuplicate();
  const [resetting, setResetting] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Election metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              void run(async () => {
                const result = await upsertElection(new FormData(form));
                if (result.error) toast.error(result.error);
                else toast.success("Election saved.");
              });
            }}
          >
            {election?.id && <input type="hidden" name="id" value={election.id} />}
            <div className="space-y-2">
              <Label htmlFor="name">Election name</Label>
              <Input id="name" name="name" defaultValue={election?.name ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={election?.date ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_votes_polled">Total votes polled</Label>
              <Input
                id="total_votes_polled"
                name="total_votes_polled"
                type="number"
                min={0}
                defaultValue={election?.total_votes_polled ?? 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="count_limit">Count finalisation limit (N)</Label>
              <Input
                id="count_limit"
                name="count_limit"
                type="number"
                min={1}
                defaultValue={election?.count_limit ?? 8}
              />
              <p className="text-xs text-muted-foreground">
                After N verified rounds for a post, those totals lock. Raise this mid-election for remaining ballots.
              </p>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              Save election
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Election state</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Current state: <span className="font-semibold capitalize text-foreground">{election?.state ?? "none"}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {STATES.map((state) => (
              <Button
                key={state}
                type="button"
                variant={election?.state === state ? "default" : "outline"}
                disabled={!election || stateBusy}
                className="capitalize"
                onClick={() => {
                  if (!election) return;
                  void runState(async () => {
                    const result = await setElectionState(election.id, state);
                    if (result.error) toast.error(result.error);
                    else toast.success(`Election is now ${state}.`);
                  });
                }}
              >
                {stateBusy ? <Spinner /> : null}
                {state}
              </Button>
            ))}
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">Reset all counts</p>
            <p className="mt-1 text-xs text-red-700">
              Deletes every submitted round and returns the election to setup. This cannot be undone.
            </p>
            <Button
              className="mt-3"
              type="button"
              variant="destructive"
              disabled={!election || resetting}
              onClick={() => {
                if (!election) return;
                if (!window.confirm("Reset all counts? This cannot be undone.")) return;
                setResetting(true);
                void resetElectionCounts(election.id).then((result) => {
                  setResetting(false);
                  if (result.error) toast.error(result.error);
                  else toast.success("Counts reset.");
                });
              }}
            >
              {resetting ? <Spinner /> : null}
              Reset counts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
