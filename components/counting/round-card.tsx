import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CountEntry, CountRound } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const STATUS: Record<CountRound["status"], { label: string; variant: "warning" | "success" | "destructive" }> = {
  pending_verification: { label: "Awaiting verification", variant: "warning" },
  verified: { label: "Verified", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export function RoundCard({
  round,
  entries,
}: {
  round: CountRound;
  entries: Array<CountEntry & { candidate_name: string }>;
}) {
  const status = STATUS[round.status];
  const total = entries.reduce((sum, entry) => sum + entry.votes, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Round {round.round_number}</CardTitle>
        <div className="flex items-center gap-2">
          {round.is_finalised && <Badge>Finalised</Badge>}
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {entries.map((entry) => (
          <div key={entry.id} className="flex justify-between">
            <span>{entry.candidate_name}</span>
            <span className="font-medium">{entry.votes}</span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>{total}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Submitted {formatDate(round.submitted_at)}
          {round.remarks ? ` · ${round.remarks}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}
