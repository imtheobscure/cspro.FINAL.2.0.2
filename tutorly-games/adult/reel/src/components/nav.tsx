"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, BookOpen, Clapperboard, Compass, Home, Languages, Route, Settings, Sparkles, Users } from "lucide-react";
import { cx } from "@/components/ui";

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/courses", label: "Courses", icon: Clapperboard },
  { href: "/lessons", label: "Lessons", icon: Sparkles },
  { href: "/vocabulary", label: "Vocabulary", icon: BookOpen },
  { href: "/grammar", label: "Grammar", icon: Languages },
  { href: "/progress", label: "Learning Path", icon: Route },
  { href: "/badges", label: "Badges", icon: Award },
  { href: "/watch-party", label: "Watch Party", icon: Users },
];

export function AppNav({ user }: { user: { name: string; color: string; level: number; xp: number; cefr: string; isGuest: boolean } }) {
  const pathname = usePathname();
  const isWatch = pathname.startsWith("/watch/");
  return (
    <header className={cx("sticky top-0 z-40 border-b border-white/10 bg-[#08080c]/80 backdrop-blur", isWatch && "hidden md:block")}>
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 sm:px-6">
        <Link href="/" className="mr-2 flex items-center gap-2 font-black tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm">L</span>
          <span className="hidden sm:inline">Lingua<span className="text-fuchsia-400">TV</span></span>
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto" aria-label="Main" style={{ scrollbarWidth: "none" }}>
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href} className={cx("flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-medium transition lg:text-[13px]", active ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white")} aria-current={active ? "page" : undefined}>
                <Icon size={15} />
                <span className="hidden lg:inline">{l.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="hidden rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-zinc-300 md:inline">
            {user.cefr} · Lv {user.level} · {user.xp} XP
          </span>
          <Link href="/settings" className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white" aria-label="Settings">
            <Settings size={16} />
          </Link>
          <Link href="/profile" className="flex items-center gap-2 rounded-full border border-white/10 py-1 pl-1 pr-3 text-xs hover:bg-white/5">
            <span className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-black" style={{ background: user.color }}>
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden sm:inline">{user.name}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
