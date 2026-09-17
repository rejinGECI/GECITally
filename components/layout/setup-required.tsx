import { BrandLockup } from "@/components/branding/geci-mark";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupRequired() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-lg">
        <CardHeader>
          <BrandLockup />
          <CardTitle className="pt-4">Connect Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Copy <code className="text-foreground">.env.example</code> to{" "}
            <code className="text-foreground">.env.local</code> and add your project URL, anon key, and
            service role key.
          </p>
          <p>
            Then run <code className="text-foreground">supabase/migrations/0001_init.sql</code> in the
            SQL editor, create an Auth user, and set that profile role to <strong>admin</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
