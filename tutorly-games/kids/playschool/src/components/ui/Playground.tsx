/**
 * THE PLAYGROUND — PlaySchool's skin, in one component.
 *
 * A fixed, non-interactive layer painted behind everything: a soft sky band at the
 * top, a low sun, clouds drifting across, and a scalloped grass strip along the
 * bottom with a few toys resting on it. It uses nothing but the Tutorly palette
 * (`skysoft`, `sun`, `sage`, `sand`), so the game still looks like a sibling of
 * every other Tutorly game — it just looks like the one you play outside.
 *
 * It is rendered once in `app/layout.tsx`, and the screens sit on top with
 * `bg-transparent`, which is what makes the whole app feel like a playground
 * without a single game mode or tap target changing. The styles live in
 * `globals.css` under "THE PLAYGROUND SKIN".
 */

const CLOUDS = [
  { top: "4vh", width: 150, height: 40, duration: 96, delay: 0, opacity: 0.95 },
  { top: "11vh", width: 96, height: 28, duration: 132, delay: -34, opacity: 0.8 },
  { top: "19vh", width: 190, height: 48, duration: 158, delay: -76, opacity: 0.7 },
  { top: "27vh", width: 118, height: 32, duration: 118, delay: -18, opacity: 0.6 },
  { top: "35vh", width: 76, height: 22, duration: 176, delay: -102, opacity: 0.45 },
];

const TOYS = [
  { left: "6%", icon: "🎈" },
  { left: "22%", icon: "⚽" },
  { left: "41%", icon: "🧸" },
  { left: "58%", icon: "🪁" },
  { left: "74%", icon: "🛴" },
  { left: "90%", icon: "🪀" },
];

export function Playground() {
  return (
    <div className="pg-layer" aria-hidden>
      <div className="pg-sky" />
      <div className="pg-sun" />

      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="pg-cloud"
          style={{
            top: c.top,
            width: c.width,
            height: c.height,
            opacity: c.opacity,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}

      <div className="pg-grass">
        <div className="pg-scallop" />
        {TOYS.map((t) => (
          <span key={t.left} className="pg-toy" style={{ left: t.left }}>
            {t.icon}
          </span>
        ))}
      </div>
    </div>
  );
}
