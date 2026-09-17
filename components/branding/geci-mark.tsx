import { cn } from "@/lib/utils";

export function GeciMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" fill="#065f46" />
      <circle cx="32" cy="32" r="24" fill="none" stroke="#c9a227" strokeWidth="2.5" />
      <path
        d="M20 40c2-10 8-16 12-18 4 2 10 8 12 18"
        fill="none"
        stroke="#ecfdf5"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M24 28h16M32 18v22"
        fill="none"
        stroke="#c9a227"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text
        x="32"
        y="50"
        textAnchor="middle"
        fill="#ecfdf5"
        fontSize="8"
        fontFamily="Poppins, sans-serif"
        fontWeight="700"
      >
        GECI
      </text>
    </svg>
  );
}

export function BrandLockup({
  compact = false,
  light = false,
}: {
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <GeciMark className={compact ? "size-9" : "size-12"} />
      <div className="leading-tight">
        <p className={cn("font-semibold tracking-tight", light ? "text-white" : "text-foreground")}>
          GECI Tally
        </p>
        {!compact && (
          <p className={cn("text-xs", light ? "text-emerald-100" : "text-muted-foreground")}>
            Government Engineering College Idukki
          </p>
        )}
      </div>
    </div>
  );
}
