"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { requireSession } from "@/lib/auth";
import { isPasswordStrongEnough } from "@/lib/password";
import type { Role } from "@/lib/session";
import { emailExists, createUser, listUsers, setUserDisabled, setUserRole } from "@/lib/users";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function countEnabledAdmins(): number {
  return listUsers().filter((u) => u.role === "admin" && !u.disabled).length;
}

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  const session = await requireSession("admin");

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "viewer") as Role;

  if (!email || !email.includes("@")) return { ok: false, message: "Enter a valid email." };
  if (!isPasswordStrongEnough(password)) {
    return { ok: false, message: "Password must be at least 12 characters." };
  }
  if (!["viewer", "moderator", "admin"].includes(role)) {
    return { ok: false, message: "Invalid role." };
  }
  if (emailExists(email)) {
    return { ok: false, message: "A user with that email already exists." };
  }

  const user = createUser(email, password, role);
  recordAudit(session, {
    action: "create_user",
    object: `user#${user.id}`,
    detail: `${user.email} (${user.role})`,
    result: "success",
  });
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function setRoleAction(userId: number, role: Role): Promise<ActionResult> {
  const session = await requireSession("admin");

  if (session.sub === userId && role !== "admin" && countEnabledAdmins() <= 1) {
    return { ok: false, message: "You're the only admin -- promote someone else first." };
  }

  setUserRole(userId, role);
  recordAudit(session, { action: "set_user_role", object: `user#${userId}`, detail: role, result: "success" });
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function setDisabledAction(userId: number, disabled: boolean): Promise<ActionResult> {
  const session = await requireSession("admin");

  if (session.sub === userId && disabled) {
    return { ok: false, message: "You can't disable your own account." };
  }
  if (disabled && countEnabledAdmins() <= 1) {
    const target = listUsers().find((u) => u.id === userId);
    if (target?.role === "admin") {
      return { ok: false, message: "This is the only enabled admin -- promote someone else first." };
    }
  }

  setUserDisabled(userId, disabled);
  recordAudit(session, {
    action: disabled ? "disable_user" : "enable_user",
    object: `user#${userId}`,
    result: "success",
  });
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
