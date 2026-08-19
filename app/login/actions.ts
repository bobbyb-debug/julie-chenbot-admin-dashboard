"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/audit";
import {
  findUserByEmail,
  isLoginRateLimited,
  recordLoginAttempt,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

export interface LoginState {
  error: string | null;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  if (isLoginRateLimited(email)) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  recordLoginAttempt(email);

  const user = findUserByEmail(email);
  const valid =
    user != null &&
    !user.disabled &&
    verifyPassword(password, user.password_hash, user.password_salt);

  if (!valid || !user) {
    recordAudit(
      { email, role: "unknown" },
      { action: "login", result: "failure", detail: "invalid credentials" },
    );
    return { error: "Incorrect email or password." };
  }

  const token = createSessionToken({ sub: user.id, email: user.email, role: user.role });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

  recordAudit({ email: user.email, role: user.role }, { action: "login", result: "success" });

  redirect(next.startsWith("/") ? next : "/dashboard");
}
