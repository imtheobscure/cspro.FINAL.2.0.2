import { getCurrentUser } from "@/lib/auth";
import { error, json, readJson } from "@/lib/api";
import { importTitle } from "@/modules/discovery/service";
import type { DiscoverTitle } from "@/modules/discovery/types";

type Body = { title?: DiscoverTitle };

/**
 * Adds a film/series from an authorized catalog to the local library. Sources are
 * re-resolved server-side, so a stale or tampered client payload cannot inject a
 * source the provider did not publish.
 */
export async function POST(req: Request) {
  const { user, profile } = await getCurrentUser();
  const body = await readJson<Body>(req);
  if (!body.title?.id || !body.title.providerId) return error("A discovery title is required");
  try {
    const result = await importTitle({
      title: body.title,
      userId: user.id,
      targetLanguage: profile.targetLanguage,
      nativeLanguage: profile.nativeLanguage,
    });
    return json(result, 201);
  } catch (err) {
    return error((err as Error).message, 422);
  }
}
