import { json } from "@/lib/api";
import { browseCatalog } from "@/modules/discovery/service";

/**
 * The Discover page's opening feed.
 *
 * No query, no key: Dailymotion is keyless, so a fresh install can show real,
 * playable videos on day one instead of an empty page.
 */
export async function GET(req: Request) {
  const topics = Number(new URL(req.url).searchParams.get("topics") ?? 4);
  try {
    const sections = await browseCatalog(Number.isFinite(topics) ? Math.min(Math.max(topics, 1), 6) : 4);
    return json({ sections });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[discover/browse] ${message}`);
    return json({ sections: [], errors: [{ provider: "browse", message }] });
  }
}
