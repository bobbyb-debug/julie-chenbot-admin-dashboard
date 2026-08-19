"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/audit";
import { getSession, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });

  if (session) {
    recordAudit({ email: session.email, role: session.role }, { action: "logout", result: "success" });
  }

  redirect("/login");
}
