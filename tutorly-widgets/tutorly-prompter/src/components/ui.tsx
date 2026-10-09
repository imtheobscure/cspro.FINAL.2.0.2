import React from "react";
import { cn } from "../utils/cn";

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "danger" | "subtle";
    size?: "sm" | "md" | "lg";
  }
> = ({ className, variant = "primary", size = "md", ...rest }) => {
  const variants: Record<string, string> = {
    primary:
      "bg-blue-600 hover:bg-blue-500 text-white shadow shadow-blue-900/30",
    ghost: "bg-transparent hover:bg-white/5 text-slate-200 border border-white/10",
    danger: "bg-rose-600 hover:bg-rose-500 text-white",
    subtle: "bg-white/5 hover:bg-white/10 text-slate-100",
  };
  const sizes: Record<string, string> = {
    sm: "h-7 px-2 text-xs rounded-md",
    md: "h-9 px-3 text-sm rounded-lg",
    lg: "h-11 px-4 text-base rounded-lg",
  };
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
    />
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className,
  ...rest
}) => (
  <input
    {...rest}
    className={cn(
      "h-9 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30",
      className,
    )}
  />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className,
  ...rest
}) => (
  <textarea
    {...rest}
    className={cn(
      "w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30",
      className,
    )}
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  children,
  ...rest
}) => (
  <select
    {...rest}
    className={cn(
      "h-9 w-full appearance-none rounded-lg border border-white/10 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30",
      className,
    )}
  >
    {children}
  </select>
);

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...rest
}) => (
  <div
    {...rest}
    className={cn(
      "rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm p-4 shadow-lg shadow-black/20",
      className,
    )}
  />
);

export const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, hint, children, className }) => (
  <label className={cn("block", className)}>
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
    </div>
    {children}
  </label>
);

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}> = ({ checked, onChange, label, hint }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={cn(
      "flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-left transition hover:border-white/20",
    )}
  >
    <div className="min-w-0">
      <div className="text-sm text-slate-100">{label}</div>
      {hint && <div className="truncate text-[11px] text-slate-500">{hint}</div>}
    </div>
    <span
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition",
        checked ? "bg-blue-500" : "bg-slate-700",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
          checked ? "left-[18px]" : "left-0.5",
        )}
      />
    </span>
  </button>
);

export const Pill: React.FC<{
  children: React.ReactNode;
  color?: "blue" | "amber" | "rose" | "emerald" | "violet" | "slate";
  className?: string;
}> = ({ children, color = "slate", className }) => {
  const map: Record<string, string> = {
    blue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    slate: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
        map[color],
        className,
      )}
    >
      {children}
    </span>
  );
};
