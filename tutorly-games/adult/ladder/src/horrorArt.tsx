import React from "react";

// ─────────────────────────────────────────────────────────────
// Jump scare art
//
// The scare used to be a hand-drawn face, which read as a cartoon. It is now a
// REAL photograph, picked at random, blown up to fill the screen and pushed
// hard with colour grading, shake, strobe, blood and grain. Every photo below
// is freely licensed and downloaded into /public/images/scares (the licence and
// author are shown in the corner of the scare and listed in CREDITS.md beside
// the files), so nothing is hot-linked and nothing can 404 mid-scare.
// ─────────────────────────────────────────────────────────────

export interface ScarePhoto {
  /** File name inside public/images/scares. */
  file: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
}

export const SCARE_PHOTOS: ScarePhoto[] = [
  {
    file: "face-zombie.jpg",
    title: "Zombie Walk — Into The Lens",
    author: "Anthony Ingram-Westover",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
  {
    file: "face-clown.jpg",
    title: "Horror Clown Maske",
    author: "Wikimedia Commons contributor",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    file: "face-mask.jpg",
    title: "Zombie Halloween Mask",
    author: "Wikimedia Commons contributor",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    file: "face-family.jpg",
    title: "Scary Zombie Family Faces",
    author: "Joe Shlabotnik",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
  {
    file: "doll.jpg",
    title: "Creepy Doll, Barnaul, Russia",
    author: "Anjum Vahanvati",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
  },
  {
    file: "skull.jpg",
    title: "Human skull of a boy (anatomical specimen)",
    author: "Wikimedia Commons contributor",
    license: "CC BY 3.0 de",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/de/",
  },
  {
    file: "zombie-horde.jpg",
    title: "Zombie Walk Cannes 2013",
    author: "Wikimedia Commons contributor",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    file: "noh-ghost.jpg",
    title: 'Shuosai — Yase-Onna, mask for a ghost role in a Nō play',
    author: "Walters Art Museum",
    license: "Public domain",
    licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
  },
];

/** Kid mode gets the non-gory half of the set; adult mode can draw any of them. */
const GENTLE = ["noh-ghost.jpg", "skull.jpg", "face-mask.jpg", "doll.jpg"];

export const pickScarePhoto = (seed: number, gore: boolean): ScarePhoto => {
  const pool = gore ? SCARE_PHOTOS : SCARE_PHOTOS.filter(p => GENTLE.includes(p.file));
  const i = Math.abs(Math.floor(seed)) % Math.max(1, pool.length);
  return pool[i] ?? SCARE_PHOTOS[0];
};

/** Relative so the game also works when served from a sub-path (/tutorly-games/...). */
export const scareSrc = (p: ScarePhoto) => `images/scares/${p.file}`;

/** Warm the browser cache so the first scare is instant. */
export const preloadScarePhotos = () => {
  if (typeof window === "undefined" || typeof Image === "undefined") return;
  SCARE_PHOTOS.forEach(p => {
    const img = new Image();
    img.src = scareSrc(p);
  });
};

export const ScarePhotoLayer: React.FC<{ photo: ScarePhoto; gore: boolean }> = ({ photo, gore }) => (
  <>
    <img
      className="scare-photo"
      src={scareSrc(photo)}
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        inset: "-6%",
        width: "112%",
        height: "112%",
        objectFit: "cover",
        filter: gore
          ? "grayscale(.22) contrast(1.5) saturate(1.35) brightness(.82)"
          : "grayscale(.5) contrast(1.3) saturate(.9) brightness(.86)",
      }}
    />
    {/* duotone wash pulled over the photo */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        mixBlendMode: "multiply",
        background: gore
          ? "radial-gradient(circle at 50% 42%, rgba(255,60,60,0.85) 0%, rgba(70,0,0,0.95) 62%, rgba(0,0,0,1) 100%)"
          : "radial-gradient(circle at 50% 42%, rgba(140,120,255,0.7) 0%, rgba(20,8,50,0.95) 65%, rgba(0,0,0,1) 100%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        mixBlendMode: "screen",
        opacity: 0.5,
        background: gore
          ? "linear-gradient(190deg, rgba(255,150,150,0.5), rgba(0,0,0,0) 55%)"
          : "linear-gradient(190deg, rgba(160,150,255,0.45), rgba(0,0,0,0) 55%)",
      }}
    />
  </>
);

export const ScareCredit: React.FC<{ photo: ScarePhoto }> = ({ photo }) => (
  <div className="scare-credit">
    “{photo.title}” — {photo.author} · {photo.license}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Drawn gore layers (on top of the photograph)
// ─────────────────────────────────────────────────────────────
export const BloodSplatter: React.FC<{ seed?: number; opacity?: number }> = ({ seed = 11, opacity = 0.9 }) => {
  const rnd = (i: number) => {
    const x = Math.sin(seed * 97.3 + i * 41.7) * 10000;
    return x - Math.floor(x);
  };
  const blobs = Array.from({ length: 26 }).map((_, i) => ({
    cx: 12 + rnd(i) * 76,
    cy: 10 + rnd(i + 50) * 80,
    r: 1.4 + rnd(i + 90) * 8.5,
    op: 0.45 + rnd(i + 130) * 0.5,
  }));
  const streaks = Array.from({ length: 9 }).map((_, i) => ({
    x: rnd(i + 200) * 92 + 4,
    y0: rnd(i + 220) * 40,
    len: 14 + rnd(i + 240) * 46,
    w: 1.4 + rnd(i + 260) * 5,
    op: 0.35 + rnd(i + 280) * 0.5,
  }));
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", opacity }}>
      <defs>
        <radialGradient id="bloodBlob">
          <stop offset="0%" stopColor="#c01414" />
          <stop offset="60%" stopColor="#8b0d0d" />
          <stop offset="100%" stopColor="#4a0505" />
        </radialGradient>
      </defs>
      {streaks.map((s, i) => (
        <rect key={`s${i}`} x={s.x} y={s.y0} width={s.w} height={s.len} rx={s.w / 2} fill="#7a0a0a" opacity={s.op} />
      ))}
      {blobs.map((b, i) => (
        <ellipse key={`b${i}`} cx={b.cx} cy={b.cy} rx={b.r} ry={b.r * 1.25} fill="url(#bloodBlob)" opacity={b.op} />
      ))}
      {blobs.slice(0, 14).map((b, i) => (
        <circle key={`d${i}`} cx={b.cx + b.r * 1.6} cy={b.cy + b.r * 2.4} r={Math.max(0.6, b.r * 0.32)} fill="#9c0f0f" opacity={b.op * 0.9} />
      ))}
    </svg>
  );
};

export const DripCurtain: React.FC<{ seed?: number }> = ({ seed = 23 }) => {
  const rnd = (i: number) => {
    const x = Math.sin(seed * 13.7 + i * 29.1) * 10000;
    return x - Math.floor(x);
  };
  return (
    <svg
      className="scare-drips"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <defs>
        <linearGradient id="dripRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a51010" />
          <stop offset="100%" stopColor="#4c0404" />
        </linearGradient>
      </defs>
      {Array.from({ length: 22 }).map((_, i) => {
        const x = i * (100 / 22) + 1;
        const h = 6 + rnd(i) * 34;
        const w = 2.6 + rnd(i + 40) * 4.2;
        return (
          <g key={i}>
            <rect x={x} y={-2} width={w} height={h} rx={w / 2} fill="url(#dripRed)" opacity={0.86} />
            <circle cx={x + w / 2} cy={h - 1} r={w * 0.42} fill="#7d0b0b" opacity={0.9} />
          </g>
        );
      })}
      <path d="M0 0 H100 V9 q-10 6 -20 0 t-20 0 t-20 0 t-20 0 t-20 0 V0 Z" fill="#6b0808" opacity={0.92} />
    </svg>
  );
};

export const GrainOverlay: React.FC = () => (
  <div
    className="scare-grain"
    style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      opacity: 0.22,
      mixBlendMode: "overlay",
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='0.9'/></svg>\")",
    }}
  />
);

// ─────────────────────────────────────────────────────────────
// Scare choreography
// ─────────────────────────────────────────────────────────────
export const SCARE_CSS = `
  .scare-root { animation: scareIn 220ms ease-out both; }
  @keyframes scareIn { from { opacity: 0; } to { opacity: 1; } }

  .scare-photo { animation: scarePush 1.9s cubic-bezier(.1,.9,.2,1) both, scareJitter 90ms steps(2) infinite; }
  @keyframes scarePush {
    0%   { transform: scale(1.5) rotate(-2.5deg); filter: brightness(2.6) contrast(2.2) saturate(.2); }
    7%   { transform: scale(1.42) rotate(2deg); }
    16%  { transform: scale(1.3) rotate(-1.4deg); }
    100% { transform: scale(1.06) rotate(0deg); }
  }
  @keyframes scareJitter {
    0%   { translate: 0 0; }
    50%  { translate: -3px 2px; }
    100% { translate: 3px -2px; }
  }

  .scare-shake { animation: scareShake 240ms linear infinite; }
  @keyframes scareShake {
    0%   { transform: translate3d(0,0,0)   rotate(0deg); }
    20%  { transform: translate3d(-14px,9px,0)  rotate(-.7deg); }
    40%  { transform: translate3d(12px,-11px,0) rotate(.6deg); }
    60%  { transform: translate3d(-9px,-7px,0)  rotate(.5deg); }
    80%  { transform: translate3d(10px,8px,0)   rotate(-.4deg); }
    100% { transform: translate3d(0,0,0)   rotate(0deg); }
  }

  .scare-flash { animation: scareFlash 620ms ease-out both; }
  @keyframes scareFlash {
    0%   { opacity: 1; }
    5%   { opacity: .85; }
    28%  { opacity: .12; }
    100% { opacity: 0; }
  }

  .scare-strobe { animation: scareStrobe 130ms steps(2) 6 both; }
  @keyframes scareStrobe {
    0%, 100% { opacity: .2; }
    50%      { opacity: .85; }
  }

  .scare-drips { animation: dripsDown 1.6s cubic-bezier(.3,1,.4,1) both; }
  @keyframes dripsDown { from { transform: translateY(-14%); } to { transform: translateY(0); } }

  .scare-grain { animation: grainShift 220ms steps(3) infinite; }
  @keyframes grainShift {
    0%   { transform: translate(0,0); }
    33%  { transform: translate(-3%,2%); }
    66%  { transform: translate(2%,-3%); }
    100% { transform: translate(0,0); }
  }

  .scare-credit {
    position: absolute;
    left: 10px;
    bottom: 8px;
    font: 500 10px/1.3 system-ui, sans-serif;
    color: rgba(255,255,255,0.42);
    letter-spacing: .2px;
    pointer-events: none;
    z-index: 6;
  }
  .scare-hint {
    position: absolute;
    right: 12px;
    bottom: 10px;
    font: 800 12px/1 system-ui, sans-serif;
    color: rgba(255,255,255,0.55);
    pointer-events: none;
    z-index: 6;
  }

  /* Motion is the player's choice: the game's Animations setting is seeded from
     prefers-reduced-motion, so an untouched setting still means a still scare. */
  .scare-root:not(.scare-anim) .scare-photo { animation: none !important; transform: scale(1.12); }
  .scare-root:not(.scare-anim) .scare-shake,
  .scare-root:not(.scare-anim) .scare-strobe,
  .scare-root:not(.scare-anim) .scare-grain,
  .scare-root:not(.scare-anim) .scare-drips,
  .scare-root:not(.scare-anim) .scare-flash { animation: none !important; opacity: .55; }
`;
