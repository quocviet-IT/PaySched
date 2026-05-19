import { signIn } from "./actions";
import { LoginForm } from "./login-form";

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
            <span className="eyebrow mb-3">Hung Phat</span>
            <h1 className="font-title text-[36px] leading-tight text-hp-ink">
              PaySchedManager
            </h1>
            <div className="mt-5 h-px bg-hp-rule" />
            <p className="mt-5 text-sm text-hp-body">
              Đăng nhập để tiếp tục quản lý lịch thanh toán.
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
