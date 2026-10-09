import React, { useEffect, useRef } from "react";

/**
 * The shared look of the app.
 *
 * Everything here exists so the premium feel is consistent rather than re-invented
 * on each screen: one card shape, one gauge, one heart meter, one modal, one set of
 * animations. Colors come from the platform registry (Preply's Flamingo Pink, the
 * Eerie Black ink), so the whole product is recognizably *this* app.
 */

export const INK = "#121118";
export const PINK = "#FF79AC";

/* ------------------------------------------------------------------ basics -- */

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { glow?: string }> = ({
  className = "",
  glow = "",
  children,
  ...rest
}) => (
  <div
    {...rest}
    className={`rounded-3xl border border-black/12 bg-white p-5 shadow-[0_1px_2px_rgba(18,17,24,0.04),0_8px_24px_-12px_rgba(18,17,24,0.12)] ${glow} ${className}`}
  >
    {children}
  </div>
);

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger" | "dark";
  size?: "sm" | "md" | "lg";
};

export const Btn: React.FC<BtnProps> = ({ variant = "primary", size = "md", className = "", ...rest }) => {
  const variants = {
    primary: "bg-[#FF79AC] text-white hover:brightness-105 border-transparent shadow-[0_6px_16px_-6px_rgba(255,121,172,0.8)]",
    dark: "bg-[#121118] text-white hover:bg-black border-transparent",
    outline: "bg-white text-[#121118] border-black/16 hover:border-black/34",
    ghost: "bg-transparent text-[#121118]/88 border-transparent hover:bg-black/12",
    danger: "bg-red-50 text-red-600 border-red-100 hover:bg-red-100",
  } as const;
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  } as const;
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${sizes[size]} ${className}`}
    />
  );
};

/**
 * A platform's real logo, with the emoji as the fallback.
 *
 * Built-in platforms ship their own favicon inlined (`lib/platformLogos.ts`), so this is
 * an image and not a guessed symbol in the normal case. If the image cannot load — a
 * cleared cache, a broken custom URL, a data URL stripped by a proxy — the emoji shows
 * instead, so a chip never renders as an empty box.
 */
export const PlatformMark: React.FC<{ platform: { name: string; emoji: string; logoUrl?: string }; size?: number; className?: string }> = ({
  platform,
  size = 16,
  className = "",
}) => {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [platform.logoUrl]);
  if (!platform.logoUrl || failed) {
    return (
      <span className={className} style={{ fontSize: size * 0.95, lineHeight: 1 }} aria-label={platform.name} role="img">
        {platform.emoji}
      </span>
    );
  }
  return (
    <img
      src={platform.logoUrl}
      alt={platform.name}
      title={platform.name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-[4px] object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export const Pill: React.FC<{
  tone?: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}> = ({ tone = "#121118", children, className = "", title }) => (
  <span
    title={title}
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ${className}`}
    style={{ backgroundColor: `${tone}14`, color: tone }}
  >
    {children}
  </span>
);

export const SectionTitle: React.FC<{ icon?: string; title: string; sub?: string; right?: React.ReactNode }> = ({
  icon,
  title,
  sub,
  right,
}) => (
  <div className="mb-4 flex items-end justify-between gap-4">
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#121118]">
        {icon && <span className="text-xl">{icon}</span>}
        {title}
      </h2>
      {sub && <p className="mt-0.5 text-sm text-[#121118]/85">{sub}</p>}
    </div>
    {right}
  </div>
);

export const Stat: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string; icon?: string }> = ({
  label,
  value,
  sub,
  tone = INK,
  icon,
}) => (
  <div className="rounded-2xl border border-black/12 bg-white/70 p-3">
    <p className="flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-[#121118]/78">
      {icon && <span>{icon}</span>}
      {label}
    </p>
    <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: tone }}>
      {value}
    </p>
    {sub && <p className="text-[12px] text-[#121118]/82">{sub}</p>}
  </div>
);

export const Empty: React.FC<{ icon: string; title: string; body: string; action?: React.ReactNode }> = ({
  icon,
  title,
  body,
  action,
}) => (
  <div className="rounded-3xl border border-dashed border-black/16 bg-white/60 p-10 text-center">
    <div className="text-4xl">{icon}</div>
    <h3 className="mt-2 text-base font-bold text-[#121118]">{title}</h3>
    <p className="mx-auto mt-1 max-w-sm text-sm text-[#121118]/85">{body}</p>
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

/* ------------------------------------------------------------------ gauges -- */

/** The circular Profile Power Score. Animates from 0 on mount. */
export const Gauge: React.FC<{ value: number; size?: number; color: string; label?: string; sublabel?: string; thickness?: number }> = ({
  value,
  size = 92,
  color,
  label,
  sublabel,
  thickness = 8,
}) => {
  const safe = Math.max(0, Math.min(100, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const id = React.useId();
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`${color}1f`} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safe / 100)}
          className="gauge-arc"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums leading-none" style={{ color }}>
          {label ?? Math.round(safe)}
        </span>
        {sublabel && <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#121118]/82">{sublabel}</span>}
      </div>
    </div>
  );
};

export const Meter: React.FC<{ value: number; color: string; label?: string; right?: React.ReactNode; height?: number }> = ({
  value,
  color,
  label,
  right,
  height = 8,
}) => (
  <div>
    {(label || right) && (
      <div className="mb-1 flex items-center justify-between text-[12px] font-semibold text-[#121118]/88">
        <span>{label}</span>
        <span className="tabular-nums">{right}</span>
      </div>
    )}
    <div className="overflow-hidden rounded-full bg-black/12" style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: `linear-gradient(90deg, ${color}bb, ${color})` }}
      />
    </div>
  </div>
);

/**
 * The heart-shaped health meter.
 *
 * Drawn as a real heart with the fill clipped to it, so a low score reads
 * emotionally rather than as just another progress bar — which is the point of a
 * burnout signal.
 */
export const HeartScore: React.FC<{ value: number; size?: number; color?: string }> = ({ value, size = 74, color }) => {
  const safe = Math.max(0, Math.min(100, value));
  const tone = color ?? (safe >= 75 ? "#FB7185" : safe >= 50 ? "#F59E0B" : "#64748B");
  const id = React.useId();
  const heart = "M50 88 C22 68 8 52 8 34 C8 20 19 10 32 10 C40 10 47 14 50 21 C53 14 60 10 68 10 C81 10 92 20 92 34 C92 52 78 68 50 88 Z";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <clipPath id={`heart-${id}`}>
            <path d={heart} />
          </clipPath>
          <linearGradient id={`fill-${id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={tone} />
            <stop offset="100%" stopColor={tone} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path d={heart} fill={`${tone}1f`} />
        <g clipPath={`url(#heart-${id})`}>
          <rect
            x="0"
            y={100 - safe}
            width="100"
            height={safe}
            fill={`url(#fill-${id})`}
            className="heart-fill"
          />
        </g>
        <path d={heart} fill="none" stroke={tone} strokeWidth="2.5" strokeOpacity="0.35" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pt-1">
        <span className="text-sm font-bold tabular-nums" style={{ color: tone }}>
          {safe}%
        </span>
      </div>
    </div>
  );
};

/** A small earnings trend line with a filled area. */
export const Sparkline: React.FC<{ values: number[]; color: string; height?: number; width?: number }> = ({
  values,
  color,
  height = 40,
  width = 120,
}) => {
  if (values.length < 2) {
    return <div className="text-[12px] text-[#121118]/76" style={{ height }}>needs 2+ weeks</div>;
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => [i * stepX, height - ((v - min) / span) * (height - 6) - 3] as const);
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const id = React.useId();
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="3" fill={color} />
    </svg>
  );
};

/* ----------------------------------------------------------------- avatars -- */

export const Avatar: React.FC<{ src?: string; name: string; size?: number; glow?: string; ring?: string }> = ({
  src,
  name,
  size = 48,
  glow,
  ring = "#12111818",
}) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl ${glow ?? ""}`}
      style={{ width: size, height: size, boxShadow: `0 0 0 3px ${ring}` }}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div
          className="grid h-full w-full place-items-center font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${PINK}, #8B5CF6)`, fontSize: size * 0.36 }}
        >
          {initials || "?"}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ modal -- */

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, subtitle, children, wide, footer }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#121118]/45 p-4 backdrop-blur-sm">
      <div
        className={`animate-rise my-4 w-full ${wide ? "max-w-5xl" : "max-w-2xl"} rounded-3xl border border-black/12 bg-white shadow-2xl`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/12 p-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#121118]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-[#121118]/85">{subtitle}</p>}
          </div>
          <Btn variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            ✕
          </Btn>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-black/12 p-4">{footer}</div>}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------- tabs -- */

export const Tabs = <T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; icon?: string; badge?: number }[];
  active: T;
  onChange: (id: T) => void;
}) => (
  <div className="scrollbar-thin -mx-1 mb-5 flex gap-1 overflow-x-auto px-1 pb-1">
    {tabs.map((t) => {
      const on = t.id === active;
      return (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`relative shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${
            on ? "bg-[#121118] text-white shadow-md" : "text-[#121118]/86 hover:bg-black/12"
          }`}
        >
          {t.icon && <span className="mr-1.5">{t.icon}</span>}
          {t.label}
          {t.badge ? (
            <span
              className={`ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                on ? "bg-white/20 text-white" : "bg-[#FF79AC]/15 text-[#FF79AC]"
              }`}
            >
              {t.badge}
            </span>
          ) : null}
        </button>
      );
    })}
  </div>
);

/* ---------------------------------------------------------------- toasts --- */

export interface Toast {
  id: string;
  message: string;
  tone: "ok" | "error" | "info";
}

export const ToastHost: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => (
  <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2">
    {toasts.map((t) => (
      <button
        key={t.id}
        onClick={() => onDismiss(t.id)}
        className={`animate-rise pointer-events-auto rounded-2xl px-4 py-3 text-left text-sm font-semibold shadow-xl ${
          t.tone === "error" ? "bg-red-600 text-white" : t.tone === "info" ? "bg-[#121118] text-white" : "bg-emerald-600 text-white"
        }`}
      >
        {t.tone === "error" ? "⚠️ " : t.tone === "info" ? "ℹ️ " : "✅ "}
        {t.message}
      </button>
    ))}
  </div>
);

/* ------------------------------------------------------------- text field -- */

export const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, hint, children, className = "" }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-[#121118]/82">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[12px] text-[#121118]/78">{hint}</span>}
  </label>
);

export const inputClass =
  "w-full rounded-xl border border-black/16 bg-white px-3 py-2 text-sm text-[#121118] outline-none transition focus:border-[#FF79AC] focus:ring-4 focus:ring-[#FF79AC]/15 placeholder:text-[#121118]/82";

/** Collapsible block used for the long JSON contracts and prompt bodies. */
export const Disclosure: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title,
  children,
  defaultOpen = false,
}) => {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={ref} open={defaultOpen} className="group rounded-2xl border border-black/12 bg-black/[0.05]">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#121118]/82 hover:text-[#121118]/91">
        <span className="mr-1 inline-block transition-transform group-open:rotate-90">▶</span>
        {title}
      </summary>
      <div className="border-t border-black/12 p-3">{children}</div>
    </details>
  );
};
