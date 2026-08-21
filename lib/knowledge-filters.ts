/**
 * Resolves the Knowledge Center's active/deactivated filter, whose
 * default changed from "All" to "Active": the normal view should
 * emphasize current active knowledge, with the full history still one
 * click away, rather than opening on a flat dump of every record ever
 * taught (see app/dashboard/knowledge/page.tsx).
 *
 * Pulled out as a pure function (rather than left inline in the page)
 * so the three-way default/active/deactivated/all resolution is
 * covered by a plain unit test instead of only being exercised
 * incidentally through a rendered page.
 */

export type ActiveFilter = "true" | "false" | "all";

/** `param` is the raw `?active=` query value (or undefined when the
 * page was opened with no explicit filter). Absent -- and only
 * absent -- resolves to "true" (Active), the new default; "all" must
 * be requested explicitly via the URL. */
export function resolveActiveFilter(param: string | undefined): ActiveFilter {
  if (param === "false" || param === "all") return param;
  return "true";
}

/** The value to send as the bot API's `active` query parameter for a
 * resolved filter, or undefined to omit it entirely (the API returns
 * every record -- active and deactivated -- when `active` is absent). */
export function activeQueryValue(filter: ActiveFilter): string | undefined {
  return filter === "all" ? undefined : filter;
}
