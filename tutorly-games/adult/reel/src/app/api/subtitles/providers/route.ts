import { json } from "@/lib/api";
import { subtitleProviderStatuses } from "@/modules/subtitles/providers";
import { whisperxStatus } from "@/modules/subtitles/whisperx";

/** Which subtitle sources are usable right now, and whether WhisperX is wired up. */
export async function GET() {
  return json({ providers: subtitleProviderStatuses(), whisperx: whisperxStatus() });
}
