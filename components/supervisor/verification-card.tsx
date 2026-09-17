"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAntiDuplicate } from "@/hooks/use-anti-duplicate";
import { reviewRound } from "@/lib/actions/supervisor";
import type { PendingRound } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

export function VerificationCard({ round }: { round: PendingRound }) {
  const [remarks, setRemarks] = useState("");
  const { isSubmitting, run } = useAntiDuplicate();
  const total = round.entries.reduce((sum, entry) => sum + entry.votes, 0);

  async function act(action: "verify" | "reject") {
    const result = await run(async () => reviewRound(round.id, action, remarks));
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(action === "verify" ? "Round verified." : "Round rejected.");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>
            {round.post.name} · Round {round.round_number}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted by {round.staff.full_name}
          </p>
        </div>
        <Badge variant="warning">Pending</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          {round.entries.map((entry) => (
            <li key={entry.id} className="flex justify-between gap-4">
              <span>
                {entry.candidate.name}
                {entry.candidate.panel_name ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {entry.candidate.panel_name}
                  </span>
                ) : null}
              </span>
              <span className="font-semibold">{entry.votes}</span>
            </li>
          ))}
        </ul>
        <p className="border-t pt-3 text-sm font-semibold">Round total: {total}</p>
        <Textarea
          placeholder="Optional remarks"
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          disabled={isSubmitting}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting}
            onClick={() => void act("reject")}
          >
            {isSubmitting ? <Spinner /> : null}
            Reject
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={() => void act("verify")}>
            {isSubmitting ? <Spinner /> : null}
            Verify
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
