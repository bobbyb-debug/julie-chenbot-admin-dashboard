import { cookies } from "next/headers";
import { getDb } from "./db";
import { hasRole } from "./rbac";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  type Role,
  type SessionPayload,
  verifySessionToken,
} from "./session";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Throws if there is no session, or the session's role is below `minimum`. */
export async function requireSession(minimum: Role = "viewer"): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new AuthError(401, "Not signed in.");
  }
  if (!hasRole(session.role, minimum)) {
    throw new AuthError(403, "You don't have permission to do that.");
  }
  return session;
}

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface DbUser {
  id: number;
  email: string;
  password_hash: string;
  password_salt: string;
  role: Role;
  disabled: number;
  created_at: string;
}

export function findUserByEmail(email: string): DbUser | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as DbUser | undefined;
}

const LOGIN_ATTEMPT_WINDOW_SECONDS = 15 * 60;
const LOGIN_ATTEMPT_LIMIT = 10;

/** Simple per-email login rate limit backed by the local database --
 * no external store needed for an admin tool with a handful of users. */
export function isLoginRateLimited(email: string): boolean {
  const db = getDb();
  const cutoff = new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_SECONDS * 1000).toISOString();
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM login_attempts WHERE email = ? AND created_at > ?",
    )
    .get(email.trim().toLowerCase(), cutoff) as { count: number };
  return row.count >= LOGIN_ATTEMPT_LIMIT;
}

export function recordLoginAttempt(email: string): void {
  getDb()
    .prepare("INSERT INTO login_attempts (email, created_at) VALUES (?, ?)")
    .run(email.trim().toLowerCase(), new Date().toISOString());
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
