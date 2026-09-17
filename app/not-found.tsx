import Link from "next/link";
import { BrandLockup } from "@/components/branding/geci-mark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <BrandLockup />
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Button asChild>
        <Link href="/">Back to GECI Tally</Link>
      </Button>
    </div>
  );
}
