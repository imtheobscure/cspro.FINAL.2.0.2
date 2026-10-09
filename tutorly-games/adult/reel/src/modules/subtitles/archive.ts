import { gunzipSync, inflateRawSync } from "node:zlib";

/**
 * Subtitle providers hand out `.gz` and `.zip` archives. Node ships everything
 * needed to open the two formats actually used for subtitles, so no extra
 * dependency is required:
 *
 *   • deflate → `zlib.inflateRawSync`
 *   • gzip    → `zlib.gunzipSync`
 *   • zip     → a minimal central-directory reader (store + deflate entries)
 */

const SUBTITLE_EXT = /\.(srt|vtt|ass|ssa|sub)$/i;

export function decodeMaybeCompressed(buffer: Buffer, filename = ""): { text: string; filename: string } | null {
  if (/\.gz$/i.test(filename) || (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b)) {
    try {
      return { text: gunzipSync(buffer).toString("utf8"), filename: filename.replace(/\.gz$/i, "") };
    } catch {
      return null;
    }
  }
  if (looksLikeZip(buffer)) {
    const entries = readZip(buffer);
    const pick = entries.find((e) => SUBTITLE_EXT.test(e.name)) ?? entries[0];
    if (!pick) return null;
    return { text: pick.text, filename: pick.name };
  }
  const text = buffer.toString("utf8");
  if (text.includes("\u0000")) return null; // binary format we cannot read
  return { text, filename };
}

export function looksLikeZip(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

type ZipEntry = { name: string; text: string };

/** Minimal ZIP reader: walks the End Of Central Directory, then each local header. */
export function readZip(buffer: Buffer): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(buffer);
  if (eocd < 0) return [];
  const entryCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];

  for (let i = 0; i < entryCount && offset + 46 <= buffer.length; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break; // central directory signature
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");

    if (localOffset + 30 <= buffer.length && buffer.readUInt32LE(localOffset) === 0x04034b50) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const data = buffer.subarray(dataStart, dataStart + compressedSize);
      try {
        const raw = method === 0 ? data : method === 8 ? inflateRawSync(data) : null;
        if (raw && !/\/$/.test(name)) entries.push({ name, text: raw.toString("utf8") });
      } catch {
        /* skip unreadable entry */
      }
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const max = Math.min(buffer.length, 66_000);
  for (let i = buffer.length - 22; i >= buffer.length - max && i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}
