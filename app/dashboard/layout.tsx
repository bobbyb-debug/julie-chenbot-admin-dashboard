import { redirect } from "next/navigation";
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
      <div className="flex min-h-screen">
        <Sidebar
          julieOnline={health.ok}
          engineRunning={engineRunning}
          role={session.role}
          environment={process.env.NODE_ENV ?? "unknown"}
        />
        <div className="flex flex-1 flex-col">
          <TopBar email={session.email} role={session.role} julieOnline={health.ok} />
          <main className="flex-1 overflow-y-auto bg-bg-base p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
