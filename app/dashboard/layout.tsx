import { redirect } from "next/navigation";
import { MobileNavProvider } from "@/components/MobileNavProvider";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/ToastProvider";
import { TopBar } from "@/components/TopBar";
import { getSession } from "@/lib/auth";
import { julie } from "@/lib/julie-client";
import { safeJulieCall } from "@/lib/safe-julie";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const health = await safeJulieCall(() => julie.health());
  const engineRunning = health.ok ? health.data.engine.running : null;

  return (
    <ToastProvider>
      <MobileNavProvider>
        {/* min-w-0 on the content column and on <main> is the fix for
            the dashboard-wide horizontal scroll: a flex item's default
            min-width is `auto` (its content's intrinsic width), not 0,
            so without this the column next to the sidebar refuses to
            shrink below whatever its widest descendant wants to be --
            forcing the whole row (and the page) wider than the
            viewport instead of letting that descendant wrap/truncate
            within the space actually available. Sidebar keeps its own
            fixed width via shrink-0 (see components/Sidebar.tsx). */}
        <div className="flex min-h-screen">
          <Sidebar
            julieOnline={health.ok}
            engineRunning={engineRunning}
            role={session.role}
            environment={process.env.NODE_ENV ?? "unknown"}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar email={session.email} role={session.role} julieOnline={health.ok} />
            <main className="min-w-0 flex-1 overflow-y-auto bg-bg-base p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </MobileNavProvider>
    </ToastProvider>
  );
}
