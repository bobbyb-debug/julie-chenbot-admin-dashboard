import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// scrypt via Node's built-in crypto module -- deliberately no bcrypt/
// argon2 dependency. scrypt is a sound, widely-used password KDF and
// this avoids pulling in a native-compiled package for a single-purpose
// admin tool with a small user base.
const KEY_LENGTH = 64;
const MIN_PASSWORD_LENGTH = 12;

export function isPasswordStrongEnough(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const stored = Buffer.from(hash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}
