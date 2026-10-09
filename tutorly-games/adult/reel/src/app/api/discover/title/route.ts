import { error, json } from "@/lib/api";
import { resolveTitle } from "@/modules/discovery/service";
import type { DiscoverTitle } from "@/modules/discovery/types";

/**
 * Detail view for one result: rendition ladder + caption files, resolved on demand.
 *
 * The caller passes the row it already has (`title`, `year`, `kind`, artwork) so the
 * response keeps the real name — the id is only good for finding the media, and for
 * Commons and archive.org it does not read like the title at all.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const id = params.get("id");
  if (!id) return error("An id is required");

  const kind = params.get("kind");
  const year = Number(params.get("year"));
  const name = params.get("title");
  const known = name
    ? {
        title: name,
        year: Number.isFinite(year) && year > 1800 ? year : null,
        kind: (kind === "movie" || kind === "series" || kind === "episode" || kind === "clip" || kind === "other" ? kind : "other") as DiscoverTitle["kind"],
        overview: params.get("overview") ?? "",
        poster: params.get("poster"),
        backdrop: params.get("backdrop"),
        duration: Number(params.get("duration")) || null,
        language: params.get("language"),
      }
    : undefined;

  const { title, error: err } = await resolveTitle(id, known);
  if (!title) return error(err ?? "Title not found", 404);
  return json({ title, warning: err });
}
