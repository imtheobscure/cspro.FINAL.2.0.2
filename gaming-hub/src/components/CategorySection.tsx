import { useState } from "react";
import type { Activity, Category } from "../data/activities";
import { ActivityCard } from "./ActivityCard";
import { useApp } from "../context/AppContext";

interface Props {
  category: Category;
  onLaunch: (a: Activity) => void;
  searchQuery: string;
}

export function CategorySection({ category, onLaunch, searchQuery }: Props) {
  const { speakOnHover, sfx, catSay } = useApp();
  const [open, setOpen] = useState(false);

  const filtered = searchQuery
    ? category.activities.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.similarTo.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : category.activities;

  if (searchQuery && filtered.length === 0) return null;

  return (
    <section
      className="relative rounded-3xl overflow-hidden mb-8 border border-white/20"
      style={{
        boxShadow: `0 25px 50px -10px ${category.glow}, 0 10px 30px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Background image with gradient overlay */}
      <div className="absolute inset-0 -z-10">
        <img src={category.bgImage} alt="" loading="lazy" decoding="async"
          className="w-full h-full object-cover scale-105" />
        <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-80`} />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Header */}
      <button
        onClick={() => {
          setOpen(o => !o);
          sfx.play(open ? "close" : "open");
        }}
        onMouseEnter={() => speakOnHover(`${category.name}. ${category.tagline}.`)}
        className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-white/10 transition"
      >
        <div className="flex items-center gap-4">
          <div className="text-6xl"
            style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.4))" }}
          >{category.icon}</div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">
              {category.name}
            </h2>
            <p className="text-white/85 text-sm sm:text-base">{category.tagline} · {category.activities.length} activities</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              catSay(`Welcome to ${category.name}. ${category.tagline}. We have ${category.activities.length} activities here!`);
            }}
            className="text-2xl hover:scale-125 transition px-3 py-1 rounded-full bg-white/20 backdrop-blur"
            title="Cat introduces this category"
          >🐱</button>
          <span className={`text-3xl text-white transition-transform duration-300 ${open ? "rotate-90" : ""}`}>▶</span>
        </div>
      </button>

      {/* Grid of activities */}
      {open && (
        <div className="p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filtered.map(a => (
              <ActivityCard key={a.id} activity={a} onLaunch={onLaunch} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
