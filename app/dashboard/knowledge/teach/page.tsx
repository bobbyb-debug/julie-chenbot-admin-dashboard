import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { TeachWorkspace } from "./TeachWorkspace";

export const dynamic = "force-dynamic";

export default async function TeachPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  try {
    await requireSession("moderator");
  } catch {
    redirect("/dashboard/knowledge");
  }

  const { mode } = await searchParams;
  const initialMode = mode === "state" ? "state" : "batch";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Teach Julie</h1>
        <p className="text-sm text-text-muted">
          Nothing is written until you review and apply. Julie never learns a fact just
          because someone typed it in Discord -- only through this reviewed flow or an
          approved automated source.
        </p>
      </div>
      <TeachWorkspace initialMode={initialMode} />
    </div>
  );
}
