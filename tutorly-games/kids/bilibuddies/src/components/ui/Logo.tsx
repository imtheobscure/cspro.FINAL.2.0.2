export function LogoMark({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="tl-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFB067" />
          <stop offset="100%" stopColor="#F4694C" />
        </linearGradient>
      </defs>
      <rect x="3" y="7" width="58" height="42" rx="18" fill="url(#tl-g)" />
      <path d="M18 47 L18 60 L31 49 Z" fill="#F4694C" />
      <circle cx="22" cy="28" r="4.6" fill="#FFF6EC" />
      <circle cx="42" cy="28" r="4.6" fill="#FFF6EC" />
      <path d="M26 37 q6 5.5 12 0" stroke="#FFF6EC" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <path
        d="M50 12 l2.4 5 5.4.7-4 3.7 1 5.4-4.8-2.7-4.8 2.7 1-5.4-4-3.7 5.4-.7z"
        fill="#FFC145"
        opacity="0.95"
      />
    </svg>
  );
}

export function Logo({ size = 40, tag = true }: { size?: number; tag?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      <div className="leading-none">
        <div className="display text-[1.65rem] font-extrabold tracking-tight text-ink">
          Tutorly
          <span className="ml-2 rounded-full bg-brand/15 px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-branddeep">
            LinguaPlay
          </span>
        </div>
        {tag && <div className="mt-1 text-[0.82rem] font-semibold text-inksoft">BiliBuddies · two-language play studio · ages 3–6</div>}
      </div>
    </div>
  );
}
