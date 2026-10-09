import React from 'react';
import { cn } from '../utils/cn';
import { avatarUrl } from '../data/decks';
import { audio } from '../lib/audio';

type Variant = 'primary' | 'ghost' | 'ok' | 'danger' | 'warm' | 'dark';
const V: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500 border-indigo-700/20 shadow-indigo-300/60',
  ghost: 'bg-white text-slate-800 hover:bg-slate-50 border-slate-300 shadow-slate-200/70',
  ok: 'bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-700/20 shadow-emerald-300/60',
  danger: 'bg-rose-600 text-white hover:bg-rose-500 border-rose-700/20 shadow-rose-300/60',
  warm: 'bg-amber-500 text-white hover:bg-amber-400 border-amber-700/20 shadow-amber-300/60',
  dark: 'bg-slate-900 text-white hover:bg-slate-800 border-black/20 shadow-slate-400/50',
};

export function Btn({
  variant = 'ghost',
  size = 'md',
  className,
  onClick,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-base rounded-xl',
    lg: 'px-6 py-3.5 text-lg rounded-2xl',
    xl: 'px-8 py-5 text-2xl rounded-3xl',
  } as const;
  return (
    <button
      {...rest}
      onClick={(e) => {
        audio.tick();
        onClick?.(e);
      }}
      className={cn(
        'inline-flex items-center justify-center gap-2 border font-bold tracking-tight transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 shadow-sm hover:shadow-md',
        sizes[size],
        V[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cn('rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_2px_24px_-8px_rgba(15,23,42,0.18)]', className)}>
      {children}
    </div>
  );
}

export function Chip({ children, tone = 'slate', className }: { children: React.ReactNode; tone?: string; className?: string }) {
  const map: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  };
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold', map[tone] ?? map.slate, className)}>{children}</span>;
}

export function Modal({
  open,
  onClose,
  children,
  wide,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  title?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cn('my-6 w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl', wide ? 'max-w-6xl' : 'max-w-3xl')}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-2xl font-black tracking-tight text-slate-900">{title}</h3>
            <Btn size="sm" onClick={onClose}>
              ✕ Close
            </Btn>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Avatar({ style, seed, size = 56, ring }: { style: string; seed: string; size?: number; ring?: string }) {
  return (
    <img
      src={avatarUrl(style, seed, size * 2)}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      className="shrink-0 rounded-full bg-slate-100 object-cover"
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 3px ${ring}` : undefined }}
    />
  );
}

export function Meter({ value, tone = '#4f46e5', height = 14 }: { value: number; tone?: string; height?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-slate-200" style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-200"
        style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, background: tone }}
      />
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition',
        on ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-500',
      )}
    >
      <span className={cn('h-4 w-8 rounded-full p-0.5 transition', on ? 'bg-emerald-500' : 'bg-slate-300')}>
        <span className={cn('block h-3 w-3 rounded-full bg-white transition', on && 'translate-x-4')} />
      </span>
      {label}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-black uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100';
