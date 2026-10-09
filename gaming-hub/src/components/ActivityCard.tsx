import { memo, useState } from "react";
import { useApp } from "../context/AppContext";
import type { Activity } from "../data/activities";
import type { SfxName } from "../hooks/useSfx";

interface Props {
  activity: Activity;
  onLaunch: (a: Activity) => void;
}

export const ActivityCard = memo(function ActivityCard({ activity, onLaunch }: Props) {
  const { speakOnHover, sfx, catSay } = useApp();
  const [hover, setHover] = useState(false);

  const handleEnter = () => {
    setHover(true);
    sfx.play("hover");
    // Speak the activity name + description
    speakOnHover(`${activity.name}. ${activity.description}`);
    // Cat reacts with intro
    catSay(activity.ai.intro, activity.ai.emotion);
  };

  const handleLeave = () => {
    setHover(false);
  };

  const handleClick = () => {
    sfx.play("click");
    if (activity.settings.sfx) {
      sfx.play(activity.settings.sfx as SfxName);
    }
    onLaunch(activity);
  };

  return (
    <button
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      onClick={handleClick}
      className="group relative flex flex-col items-center justify-between p-5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 text-left
        hover:bg-white/25 hover:-translate-y-2 hover:scale-[1.04] active:scale-95
        transition-all duration-300 ease-out cursor-pointer min-h-[170px]"
      style={{
        boxShadow: hover
          ? "0 25px 50px -12px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.2), inset 0 1px 0 rgba(255,255,255,0.4)"
          : "0 10px 25px -5px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
      aria-label={`${activity.name}: ${activity.description}`}
    >
      {/* Glossy emoji */}
      <div
        className="text-7xl mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
        style={{
          filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.4)) drop-shadow(0 2px 3px rgba(255,255,255,0.5))",
          textShadow: "0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        {activity.emoji}
      </div>

      <h3
        // hover-to-speak on the text element specifically too
        onMouseEnter={() => speakOnHover(activity.name)}
        className="text-base font-bold text-white text-center leading-tight drop-shadow-lg"
      >
        {activity.name}
      </h3>

      <p
        onMouseEnter={() => speakOnHover(activity.description)}
        className="text-xs text-white/80 text-center mt-1 line-clamp-2 leading-snug"
      >
        {activity.description}
      </p>

      {/* Settings badges */}
      <div className="flex flex-wrap gap-1 mt-2 justify-center">
        {activity.settings.timerSec ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/30 text-amber-100 border border-amber-300/50">
            ⏱ {activity.settings.timerSec}s
          </span>
        ) : null}
        {activity.settings.multiplayer && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-400/30 text-emerald-100 border border-emerald-300/50">
            👥 {activity.settings.maxPlayers ?? "Multi"}
          </span>
        )}
        {activity.settings.hints && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-400/30 text-sky-100 border border-sky-300/50">
            💡 Hints
          </span>
        )}
      </div>

      {/* "Similar to" tag, on hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-white/90 backdrop-blur">
          ≈ {activity.similarTo}
        </span>
      </div>
    </button>
  );
});
