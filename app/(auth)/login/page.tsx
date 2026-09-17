import { BrandLockup } from "@/components/branding/geci-mark";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#d1fae5,_#f8fafc_50%)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <BrandLockup />
          <CardTitle className="pt-4">Counting duty login</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use the account issued by the election admin.
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm next={next} />
        </CardContent>
      </Card>
    </div>
  );
}
