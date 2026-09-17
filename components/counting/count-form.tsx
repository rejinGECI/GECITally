"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAntiDuplicate } from "@/hooks/use-anti-duplicate";
import { submitCountRound } from "@/lib/actions/counting";
import type { Candidate, CountRound } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

type Props = {
  postId: string;
  postName: string;
  roundNumber: number;
  candidates: Candidate[];
  pendingRound: CountRound | null;
  rejectedRound: CountRound | null;
  countingOpen: boolean;
  limitReached: boolean;
};

export function CountForm({
  postId,
  postName,
  roundNumber,
  candidates,
  pendingRound,
  rejectedRound,
  countingOpen,
  limitReached,
}: Props) {
  const [votes, setVotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(candidates.map((candidate) => [candidate.id, ""])),
  );
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isSubmitting, run } = useAntiDuplicate();

  const parsed = useMemo(
    () =>
      candidates.map((candidate) => ({
        candidate,
        votes: votes[candidate.id] === "" ? NaN : Number(votes[candidate.id]),
      })),
    [candidates, votes],
  );

  const allValid = parsed.every((row) => Number.isInteger(row.votes) && row.votes >= 0);
  const total = parsed.reduce((sum, row) => sum + (Number.isFinite(row.votes) ? row.votes : 0), 0);
  const blocked = Boolean(pendingRound) || !countingOpen || (limitReached && !rejectedRound);

  function openConfirm() {
    setError(null);
    if (!allValid) {
      setError("Enter a whole number of 0 or more for every candidate.");
      return;
    }
    setOpen(true);
  }

  async function confirmSubmit() {
    await run(async () => {
      const result = await submitCountRound(
        postId,
        parsed.map((row) => ({
          candidate_id: row.candidate.id,
          votes: row.votes,
        })),
      );
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(`Round ${roundNumber} submitted for verification.`);
      setOpen(false);
      setVotes(Object.fromEntries(candidates.map((candidate) => [candidate.id, ""])));
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Round {roundNumber}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter votes for every candidate, then confirm before saving.
          </p>
        </div>
        {pendingRound && <Badge variant="warning">Awaiting supervisor verification</Badge>}
        {rejectedRound && !pendingRound && <Badge variant="destructive">Rejected — re-enter this round</Badge>}
      </CardHeader>
      <CardContent className="space-y-4">
        {rejectedRound?.remarks && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            Supervisor remarks: {rejectedRound.remarks}
          </p>
        )}
        {!countingOpen && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Counting is closed. Wait for the admin to open it.
          </p>
        )}
        {limitReached && !rejectedRound && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            This post has reached the finalisation limit. Ask the admin to raise it for remaining ballots.
          </p>
        )}
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="grid gap-2 sm:grid-cols-[1fr_140px] sm:items-center">
              <Label htmlFor={`votes-${candidate.id}`}>
                <span className="font-medium">{candidate.name}</span>
                {candidate.panel_name ? (
                  <span className="ml-2 text-xs text-muted-foreground">{candidate.panel_name}</span>
                ) : null}
              </Label>
              <Input
                id={`votes-${candidate.id}`}
                inputMode="numeric"
                min={0}
                step={1}
                type="number"
                value={votes[candidate.id]}
                disabled={blocked || isSubmitting}
                onChange={(event) =>
                  setVotes((current) => ({ ...current, [candidate.id]: event.target.value }))
                }
              />
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Round total: <span className="font-semibold text-foreground">{Number.isFinite(total) ? total : 0}</span>
          </p>
          <Button type="button" onClick={openConfirm} disabled={blocked || isSubmitting}>
            Review and submit
          </Button>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={(value) => !isSubmitting && setOpen(value)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Round {roundNumber} — Post: {postName}
            </DialogTitle>
            <DialogDescription>
              Confirm these counts. This round will wait for supervisor verification.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {parsed.map((row) => (
              <li key={row.candidate.id} className="flex justify-between gap-4">
                <span>{row.candidate.name}</span>
                <span className="font-semibold">{row.votes}</span>
              </li>
            ))}
          </ul>
          <p className="border-t pt-3 text-sm font-semibold">Total: {total}. Confirm?</p>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={isSubmitting} onClick={() => void confirmSubmit()}>
              {isSubmitting ? <Spinner /> : null}
              {isSubmitting ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
