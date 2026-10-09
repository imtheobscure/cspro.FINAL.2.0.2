"use client";

import { useEffect, useMemo, useState } from "react";
import { emojiVariants } from "@/lib/twemoji";

/**
 * Every dictionary picture is drawn from the same Twemoji SVG family so the
 * whole studio looks like one illustration set on any shared screen.
 * Falls back through CDN variants and finally to the native emoji glyph.
 */
export function WordArt({
  emoji,
  size = 128,
  className = "",
  alt = "",
}: {
  emoji: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const urls = useMemo(() => emojiVariants(emoji), [emoji]);
  const [stage, setStage] = useState(0);

  useEffect(() => setStage(0), [emoji]);

  if (stage >= urls.length) {
    return (
      <span className={className} style={{ fontSize: size * 0.86, lineHeight: 1 }} role="img" aria-label={alt || emoji}>
        {emoji}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={urls[stage]}
      alt={alt || emoji}
      width={size}
      height={size}
      draggable={false}
      className={className}
      style={{ width: size, height: size }}
      onError={() => setStage((s) => s + 1)}
    />
  );
}
