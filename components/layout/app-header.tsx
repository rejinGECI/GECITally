import Link from "next/link";
import { BrandLockup } from "@/components/branding/geci-mark";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import type { UserRole } from "@/lib/types";

const NAV: Record<UserRole, Array<{ href: string; label: string }>> = {
  admin: [
    { href: "/admin", label: "Dashboard" },
    { href: "/results", label: "Live results" },
  ],
  staff: [
    { href: "/staff", label: "Counting" },
    { href: "/results", label: "Live results" },
  ],
  supervisor: [
    { href: "/supervisor", label: "Verification" },
    { href: "/results", label: "Live results" },
  ],
};

export function AppHeader({
  role,
  name,
}: {
  role: UserRole;
  name: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={role === "admin" ? "/admin" : `/${role}`}>
          <BrandLockup compact />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {NAV[role].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs capitalize text-muted-foreground">{role}</p>
          </div>
          <form action={signOut}>
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
