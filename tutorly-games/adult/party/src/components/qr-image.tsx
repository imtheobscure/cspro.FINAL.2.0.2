"use client";

import { useEffect, useState } from "react";
import { qrDataUrl } from "@/lib/localApi";

/**
 * The join QR, drawn in the browser.
 *
 * It used to be `<img src="/api/qr?text=…">`, a route handler that ran the
 * `qrcode` package on the server. The app is a static export now, so the same
 * library runs here instead and hands the `<img>` a data URL. `text` is the full
 * join URL, which `lib/basePath.ts` builds — the phone must be able to open it
 * with no server involved.
 */
export default function QrImage({ text, className }: { text: string; className?: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!text) return;
    let alive = true;
    qrDataUrl(text)
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        // A projector with no QR still has the room code beside it, which is
        // enough to join — so a failure here is silent on purpose.
      });
    return () => {
      alive = false;
    };
  }, [text]);

  // With no room open there is nothing to encode; the placeholder keeps the
  // layout still while the code is being drawn.
  const shown = text ? src : "";
  if (!shown) return <div className={className} aria-hidden />;
  return <img src={shown} alt="Join QR" className={className} />;
}
