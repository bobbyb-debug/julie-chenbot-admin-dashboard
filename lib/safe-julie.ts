import { JulieApiError, JulieUnavailableError } from "./julie-client";

export type SafeResult<T> =
  | { ok: true; data: T }
  | { ok: false; offline: true; message: string }
  | { ok: false; offline: false; message: string; status?: number };

/** Wraps a julie-client call so pages can render "offline" vs. a real
 * error vs. success without a try/catch in every server component. */
export async function safeJulieCall<T>(fn: () => Promise<T>): Promise<SafeResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof JulieUnavailableError) {
      return { ok: false, offline: true, message: error.message };
    }
    if (error instanceof JulieApiError) {
      return { ok: false, offline: false, message: error.message, status: error.status };
    }
    return {
      ok: false,
      offline: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
