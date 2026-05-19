import { signIn } from "./actions";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/logo";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectedFrom?: string; error?: string };
}) {
  return (
    <div className="min-h-screen bg-hp-foundation flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="border border-hp-rule bg-hp-card p-9">
          <header className="mb-9">
            <Logo size="lg" />
            <div className="mt-5 h-px bg-hp-rule" />
            <p className="mt-5 text-sm text-hp-body">
              Sign in to continue managing your payment schedules.
            </p>
          </header>

          <LoginForm
            action={signIn}
            redirectedFrom={searchParams.redirectedFrom ?? "/dashboard"}
            initialError={searchParams.error}
          />
        </div>

        <p className="mt-6 text-center text-[11px] uppercase tracking-eyebrow text-hp-muted">
          Internal tool · Restricted access
        </p>
      </div>
    </div>
  );
}
