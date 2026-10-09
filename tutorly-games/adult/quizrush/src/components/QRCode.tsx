"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QR({ value, size = 220 }: { value: string; size?: number }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: "#0a0e1a", light: "#ffffff" },
    })
      .then(setUrl)
      .catch(() => setUrl(""));
  }, [value, size]);

  if (!url) return <div className="animate-pulse rounded-2xl bg-white/10" style={{ width: size, height: size }} />;
  return (
    <img
      src={url}
      alt="Join QR code"
      width={size}
      height={size}
      className="rounded-2xl bg-white p-2 shadow-2xl"
    />
  );
}
