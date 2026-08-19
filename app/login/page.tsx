import { Radio } from "lucide-react";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent-strong">
              <Radio size={22} strokeWidth={2} aria-hidden />
            </div>
          </div>
          <h1 className="text-xl font-semibold uppercase tracking-wide text-text-primary">
            Julie ChenBot
          </h1>
          <p className="text-xs font-medium uppercase tracking-widest text-accent-strong">
            Admin Control Room
          </p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6 shadow-xl">
          <LoginForm next={next && next.startsWith("/") ? next : "/dashboard"} />
        </div>
      </div>
    </div>
  );
}
