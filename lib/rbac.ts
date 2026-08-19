import type { Role } from "./session";

const RANK: Record<Role, number> = { viewer: 0, moderator: 1, admin: 2 };

export function hasRole(role: Role, minimum: Role): boolean {
  return RANK[role] >= RANK[minimum];
}

export const ROLE_LABELS: Record<Role, string> = {
  viewer: "Viewer",
  moderator: "Moderator",
  admin: "Admin",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  viewer: "Can view everything. Cannot teach, correct, or change state.",
  moderator: "Everything a Viewer can do, plus teaching, corrections, and state updates.",
  admin: "Everything a Moderator can do, plus user management and settings.",
};
