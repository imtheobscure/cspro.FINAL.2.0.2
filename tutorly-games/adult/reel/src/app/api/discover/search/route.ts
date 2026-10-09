import { getCurrentUser } from "@/lib/auth";
import { error, json, readJson } from "@/lib/api";
import { searchCatalog } from "@/modules/discovery/service";
import type { DiscoverSearchOptions } from "@/modules/discovery/types";

type Body = Partial<DiscoverSearchOptions>;

/** Fans one query out to every configured catalog and returns ranked, licensed results. */
export async function POST(req: Request) {
  await getCurrentUser();
  const body = await readJson<Body>(req);
  const query = (body.query ?? "").trim();
  if (query.length < 2) return error("Type at least two characters to search the catalogs");
  try {
    const result = await searchCatalog({
      query,
      kind: body.kind ?? "any",
      providers: body.providers,
      language: body.language ?? null,
      limit: body.limit ?? 12,
    });
    return json(result);
  } catch (err) {
    // The provider contract says one dead catalog degrades to an `errors` line, but
    // a bug in that path used to escape as a bare 500 with an empty body — which
    // blanks the page and says nothing. Report it as data instead, and log it, so a
    // search is never a dead end and the cause is visible in the server log.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[discover/search] ${query}: ${message}`, err instanceof Error ? err.stack : "");
    return json({
      query,
      titles: [],
      providers: [],
      errors: [{ provider: "search", message }],
      metadataOnly: 0,
    });
  }
}
