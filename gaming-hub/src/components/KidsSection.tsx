import { useState } from "react";
import type { Activity } from "../data/activities";
import { KIDS_COMING_SOON, type Category } from "../data/activities";
import { ActivityCard } from "./ActivityCard";
import { useApp } from "../context/AppContext";

interface Props {
  category: Category;
  onLaunch: (a: Activity) => void;
  searchQuery: string;
}

/**
 * Kids' Corner.
 *
 * Same card layout as the grown-up sections so a kid game is added by putting its
 * folder in `tutorly-games/kids/` and adding an activity with `launchKids(...)` —
 * but a deliberately different skin: bright pastels, chunky rounded tiles, drifting
 * balloons and friendly copy. While the corner is empty it shows dashed
 * "coming soon" cards instead of an empty grid.
 */
export function KidsSection({ category, onLaunch, searchQuery }: Props) {
  const { speakOnHover, sfx, catSay } = useApp();
  const [open, setOpen] = useState(true);

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? category.activities.filter(
        a =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.similarTo.toLowerCase().includes(q),
      )
    : category.activities;

  if (q && filtered.length === 0) return null;

  const empty = category.activities.length === 0;

  return (
    <section
      className="relative rounded-[2rem] overflow-hidden mb-8 border-4 border-white/60 kids-section"
      style={{ boxShadow: `0 25px 50px -10px ${category.glow}, 0 10px 30px rgba(0,0,0,0.35)` }}
    >
      {/* Soft, sunny background instead of a photo-heavy adult banner */}
      <div className="absolute inset-0 -z-10">
        <img src={category.bgImage} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover scale-105" />
        <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-85`} />
        <div className="absolute inset-0 kids-sky" />
        <span className="kids-cloud kids-cloud-1" aria-hidden />
        <span className="kids-cloud kids-cloud-2" aria-hidden />
        <span className="kids-balloon kids-balloon-1" aria-hidden>🎈</span>
        <span className="kids-balloon kids-balloon-2" aria-hidden>🎈</span>
        <span className="kids-balloon kids-balloon-3" aria-hidden>🪁</span>
      </div>

      <button
        onClick={() => {
          setOpen(o => !o);
          sfx.play(open ? "close" : "open");
        }}
        onMouseEnter={() => speakOnHover(`${category.name}. ${category.tagline}.`)}
        className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-white/10 transition"
      >
        <div className="flex items-center gap-4">
          <div className="text-6xl kids-bob" style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.3))" }}>
            {category.icon}
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-lg kids-title">
              {category.name}
            </h2>
            <p className="text-white text-sm sm:text-base font-bold drop-shadow">
              {category.tagline} · {empty ? "coming soon ✨" : `${category.activities.length} games`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => {
              e.stopPropagation();
              catSay(
                empty
                  ? "The Kids' Corner is getting ready! New little games are landing here very soon."
                  : `Welcome to the Kids' Corner! We have ${category.activities.length} games for our youngest learners.`,
              );
            }}
            className="text-2xl hover:scale-125 transition px-3 py-1 rounded-full bg-white/30 backdrop-blur"
            title="Whisker introduces this section"
          >
            🐱
          </button>
          <span className={`text-3xl text-white transition-transform duration-300 ${open ? "rotate-90" : ""}`}>▶</span>
        </div>
      </button>

      {open && (
        <div className="p-4 sm:p-6 pt-0">
          {empty ? (
            <>
              <div
                className="rounded-2xl bg-white/85 backdrop-blur px-5 py-4 mb-4 text-center"
                style={{ boxShadow: "0 10px 25px -8px rgba(0,0,0,0.25)" }}
              >
                <p className="text-lg sm:text-xl font-black text-slate-800">
                  🎈 New kids' games are on the way!
                </p>
                <p className="text-sm text-slate-600 font-semibold mt-1">
                  Bright, simple and made for little hands — nothing scary, nothing timed-out, every answer celebrated.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {KIDS_COMING_SOON.map(p => (
                  <div
                    key={p.name}
                    className="kids-soon rounded-3xl p-4 flex flex-col items-center justify-center text-center min-h-[150px] select-none"
                  >
                    <div className="text-5xl mb-2 kids-bob">{p.emoji}</div>
                    <div className="font-black text-slate-700 leading-tight">{p.name}</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">{p.hint}</div>
                    <div className="mt-2 text-[10px] font-black uppercase tracking-wider text-sky-600 bg-white/70 rounded-full px-2 py-0.5">
                      Coming soon
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {filtered.map(a => (
                <ActivityCard key={a.id} activity={a} onLaunch={onLaunch} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
