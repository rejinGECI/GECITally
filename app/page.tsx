import Link from "next/link";
import { BrandLockup } from "@/components/branding/geci-mark";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#d1fae5,_#f8fafc_45%)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <BrandLockup />
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/results">Live results</Link>
          </Button>
          <Button asChild>
            <Link href="/login">Staff login</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-700">
          Government Engineering College Idukki
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-emerald-950 md:text-6xl">
          GECI Tally — live student election counting.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Counting staff enter votes round by round. Supervisors verify every entry.
          Results appear instantly for the hall, with a lock once the finalisation limit is reached.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/results">Watch live results</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Open counting console</Link>
          </Button>
        </div>
        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            ["Counting staff", "Assigned posts only. Confirm every round before it is saved."],
            ["Supervisor", "Verify or reject submitted rounds. Progress is tracked against the count limit."],
            ["Public hall display", "Animated live totals, leading-candidate highlights, and projector mode."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border bg-white/80 p-5 shadow-sm">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
