import { cn } from "../utils/cn";
import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Btn({
  className,
  variant = "default",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "danger" | "soft" | "success";
  size?: "sm" | "md" | "lg" | "icon";
}) {
  const variants: Record<string, string> = {
    default:
      "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
    primary:
      "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white border border-indigo-700/30 hover:from-indigo-600 hover:to-indigo-700 shadow-md shadow-indigo-500/20",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger:
      "bg-gradient-to-b from-rose-500 to-rose-600 text-white border border-rose-700/30 hover:from-rose-600 hover:to-rose-700 shadow-md shadow-rose-500/20",
    soft: "bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100",
    success:
      "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-700/30 hover:from-emerald-600 hover:to-emerald-700 shadow-md shadow-emerald-500/20",
  };
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1 text-xs rounded-md gap-1",
    md: "px-3 py-1.5 text-sm rounded-lg gap-1.5",
    lg: "px-4 py-2 text-sm rounded-xl gap-2",
    icon: "p-1.5 rounded-lg",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function TInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition",
        className,
      )}
      {...props}
    />
  );
}

export function TTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition resize-y",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("text-[11px] font-semibold uppercase tracking-wider text-slate-500", className)}>
      {children}
    </label>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "bg-white border border-slate-200 rounded-2xl shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
