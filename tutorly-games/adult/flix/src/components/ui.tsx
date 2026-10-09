import clsx from "clsx";
import React from "react";

export const cx = clsx;

export const Panel: React.FC<{ children: React.ReactNode; className?: string; padded?: boolean }> = ({ children, className, padded = true }) => (
  <div
    className={cx("rounded-2xl border", padded && "p-4", className)}
    style={{ background: "var(--color-tf-panel)", borderColor: "var(--color-tf-line)" }}
  >
    {children}
  </div>
);

type ButtonKind = "primary" | "ghost" | "subtle" | "danger" | "success";

const BUTTON_STYLES: Record<ButtonKind, React.CSSProperties> = {
  primary: { background: "linear-gradient(135deg, #e50914, #ff4d5a)", color: "#fff", border: "none", fontWeight: 800 },
  success: { background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#052e16", border: "none", fontWeight: 800 },
  danger: { background: "transparent", color: "#ff8a8a", border: "1px solid #7f1d1d" },
  ghost: { background: "transparent", color: "var(--color-tf-text)", border: "1px solid var(--color-tf-line)" },
  subtle: { background: "var(--color-tf-panel-2)", color: "var(--color-tf-text)", border: "1px solid var(--color-tf-line)" },
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: ButtonKind; size?: "sm" | "md" | "lg"; active?: boolean }
> = ({ kind = "ghost", size = "md", active, className, style, ...rest }) => (
  <button
    {...rest}
    className={cx(
      "inline-flex items-center justify-center gap-2 rounded-xl transition-transform",
      "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:transform-none",
      "hover:-translate-y-[1px] active:translate-y-0",
      size === "sm" && "px-2.5 py-1.5 text-xs",
      size === "md" && "px-3.5 py-2 text-sm",
      size === "lg" && "px-5 py-3 text-base",
      className,
    )}
    style={{
      ...BUTTON_STYLES[kind],
      ...(active ? { borderColor: "var(--color-tf-brand)", color: "#fff", background: "color-mix(in srgb, var(--color-tf-brand) 30%, transparent)" } : null),
      ...style,
    }}
  />
);

export const Chip: React.FC<{ children: React.ReactNode; tone?: "brand" | "gold" | "teal" | "muted" | "purple"; onClick?: () => void; active?: boolean }> = ({
  children,
  tone = "muted",
  onClick,
  active,
}) => {
  const tones: Record<string, React.CSSProperties> = {
    brand: { background: "color-mix(in srgb, var(--color-tf-brand) 22%, transparent)", color: "#ffd7da" },
    gold: { background: "color-mix(in srgb, var(--color-tf-gold) 22%, transparent)", color: "var(--color-tf-gold)" },
    teal: { background: "color-mix(in srgb, var(--color-tf-teal) 20%, transparent)", color: "var(--color-tf-teal)" },
    purple: { background: "color-mix(in srgb, var(--color-tf-purple) 22%, transparent)", color: "#ddd2ff" },
    muted: { background: "var(--color-tf-panel-2)", color: "var(--color-tf-sub)" },
  };
  return (
    <span
      onClick={onClick}
      className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", onClick && "cursor-pointer hover:brightness-125")}
      style={{ ...tones[tone], ...(active ? { outline: "1px solid var(--color-tf-brand)", color: "#fff" } : null) }}
    >
      {children}
    </span>
  );
};

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block space-y-1">
    <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
      {label}
    </span>
    {children}
    {hint && <span className="block text-[11px]" style={{ color: "var(--color-tf-sub)" }}>{hint}</span>}
  </label>
);

export const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--color-tf-panel-2)",
  border: "1px solid var(--color-tf-line)",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 14,
  color: "var(--color-tf-text)",
  outline: "none",
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, style, ...rest }) => (
  <input {...rest} className={cx("w-full", className)} style={{ ...inputStyle, ...style }} />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, style, ...rest }) => (
  <textarea
    {...rest}
    spellCheck={false}
    className={cx("tf-scroll w-full font-mono text-[12.5px] leading-relaxed", className)}
    style={{ ...inputStyle, ...style }}
  />
);

export const ProgressBar: React.FC<{ value: number; max?: number; color?: string; height?: number; label?: string }> = ({
  value,
  max = 100,
  color = "var(--color-tf-brand)",
  height = 6,
  label,
}) => (
  <div>
    {label && (
      <div className="mb-1 flex justify-between text-[11px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
        <span>{label}</span>
        <span>{Math.round((value / max) * 100)}%</span>
      </div>
    )}
    <div className="w-full overflow-hidden rounded-full" style={{ height, background: "var(--color-tf-panel-2)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </div>
  </div>
);

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, children, maxWidth = 760, footer }) => {
  if (!open) return null;
  return (
    <div className="tf-fixed-frame z-[90]" style={{ background: "rgba(4,5,8,0.82)", backdropFilter: "blur(6px)" }}>
      <div
        className="tf-pop flex w-full flex-col overflow-hidden rounded-3xl border"
        style={{ maxWidth, maxHeight: "92vh", background: "var(--color-tf-panel)", borderColor: "var(--color-tf-line)" }}
      >
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5" style={{ borderColor: "var(--color-tf-line)" }}>
          <div className="text-lg font-black">{title}</div>
          <Button kind="ghost" size="sm" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>
        <div className="tf-scroll flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t px-5 py-3" style={{ borderColor: "var(--color-tf-line)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const Tabs: React.FC<{ tabs: { id: string; label: string; icon?: string }[]; value: string; onChange: (id: string) => void }> = ({
  tabs,
  value,
  onChange,
}) => (
  <div className="flex gap-1 rounded-xl p-1" style={{ background: "var(--color-tf-panel-2)" }}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className="flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
        style={
          value === tab.id
            ? { background: "var(--color-tf-brand)", color: "#fff" }
            : { background: "transparent", color: "var(--color-tf-sub)" }
        }
      >
        {tab.icon ? `${tab.icon} ` : ""}
        {tab.label}
      </button>
    ))}
  </div>
);

export const Empty: React.FC<{ icon: string; title: string; body: string; action?: React.ReactNode }> = ({ icon, title, body, action }) => (
  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: "var(--color-tf-line)" }}>
    <div className="text-4xl">{icon}</div>
    <div className="font-black">{title}</div>
    <p className="max-w-md text-sm" style={{ color: "var(--color-tf-sub)" }}>
      {body}
    </p>
    {action}
  </div>
);
