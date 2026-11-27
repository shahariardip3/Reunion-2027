import { db } from "./supabase";

export { buildTimeline, FOUNDED_YEAR, REUNION_YEAR } from "./timeline";

/**
 * Timeline = fixed start (1940) + admin-managed milestones + fixed end (Reunion 2027).
 * Only facts already published on the site are built in; every other milestone is added by the
 * admin (Admin → ইতিহাস), so nothing invented ever appears on the public page.
 */
export async function getHistoryEvents() {
  try {
    const { data, error } = await db().from("history_events")
      .select("id,year,title_bn,title_en,body_bn,body_en,sort_order")
      .eq("published", true)
      .order("year", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(100);
    return error || !data ? [] : data;
  } catch {
    return []; // table not created yet: the timeline still shows its fixed start and end
  }
}

