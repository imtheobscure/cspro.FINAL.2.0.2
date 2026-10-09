"use client";

import { href } from "@/lib/route";
import { TutorlyLogo } from "@/lib/shell";

export { TutorlyLogo, Mascot } from "@/lib/shell";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a href={href.home} className="group flex items-center gap-2" aria-label="Tutorly home">
      <span className="transition-transform group-hover:rotate-[-6deg] group-hover:scale-105">
        <TutorlyLogo size={compact ? 36 : 44} />
      </span>
      {!compact && (
        <span className="font-display text-2xl font-bold tracking-tight text-ink">
          WordPop<span className="text-coral-deep">.</span>
          <span className="ml-1 rounded-full bg-sun px-2 py-0.5 align-middle text-xs font-bold text-ink">KIDS</span>
        </span>
      )}
    </a>
  );
}
