import type { ReactNode, ButtonHTMLAttributes } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger" | "success"; size?: "sm" | "md" | "lg" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 hover:from-violet-400 hover:to-fuchsia-400",
    ghost: "bg-white/5 text-zinc-200 hover:bg-white/10",
    outline: "border border-white/15 text-zinc-200 hover:bg-white/5",
    danger: "bg-rose-500/90 text-white hover:bg-rose-500",
    success: "bg-emerald-500/90 text-white hover:bg-emerald-500",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };
  return <button className={cx(base, variants[variant], sizes[size], className)} {...props} />;
}

export function Pill({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", className)} style={color ? { borderColor: `${color}55`, background: `${color}22`, color } : undefined}>
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur", className)}>{children}</div>;
}

export function ProgressBar({ value, color = "#a78bfa", className, height = 6 }: { value: number; color?: string; className?: string; height?: number }) {
  return (
    <div className={cx("w-full overflow-hidden rounded-full bg-white/10", className)} style={{ height }} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

export function SectionTitle({ children, sub, action }: { children: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">{children}</h2>
        {sub && <p className="mt-0.5 text-sm text-zinc-400">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <Card className="flex items-center gap-4">
      {icon && <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-xl">{icon}</div>}
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
        {hint && <div className="text-xs text-zinc-500">{hint}</div>}
      </div>
    </Card>
  );
}

export const RARITY_COLORS: Record<string, string> = { common: "#94a3b8", uncommon: "#34d399", rare: "#60a5fa", epic: "#c084fc", legendary: "#fbbf24" };
export const CEFR_COLORS: Record<string, string> = { A1: "#34d399", A2: "#4ade80", B1: "#60a5fa", B2: "#818cf8", C1: "#c084fc", C2: "#f472b6" };
