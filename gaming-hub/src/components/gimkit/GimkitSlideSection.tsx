import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import type { GimkitPayload } from "../../data/gimkitModes";

export function GimkitSlideSection({ payload }: { payload: GimkitPayload }) {
  const { speakOnHover } = useApp();
  return (
    <section className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
      {payload.slideshow.lessons.map((slide, idx) => (
        <div key={slide.title} className="premium-panel overflow-hidden grid lg:grid-cols-[380px_1fr]">
          <div className="relative min-h-72">
            <img src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className={`inline-block text-xs px-3 py-1 rounded-full uppercase tracking-widest font-black mb-2 bg-${slide.color}-500/40 border border-${slide.color}-300/40`}>
                {slide.color} · slide {idx + 1}
              </div>
              <h2 onMouseEnter={() => speakOnHover(slide.title)} className="text-3xl font-black title-shimmer leading-tight">{slide.title}</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <p onMouseEnter={() => speakOnHover(slide.body)} className="text-white/85 leading-relaxed">{slide.body}</p>

            <div>
              <div className="text-xs uppercase tracking-widest text-amber-200 font-bold mb-2">📝 Examples</div>
              <ul className="space-y-1">
                {slide.examples.map((e, i) => (
                  <li key={i} onMouseEnter={() => speakOnHover(e)} className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-sm">{e}</li>
                ))}
              </ul>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-300/25">
                <div className="text-[10px] uppercase tracking-widest text-blue-200 font-black mb-1">⏰ When</div>
                <p onMouseEnter={() => speakOnHover(slide.whenToUse)} className="text-xs">{slide.whenToUse}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-300/25">
                <div className="text-[10px] uppercase tracking-widest text-emerald-200 font-black mb-1">🌍 Where</div>
                <p onMouseEnter={() => speakOnHover(slide.whereToUse)} className="text-xs">{slide.whereToUse}</p>
              </div>
              <div className="p-3 rounded-xl bg-fuchsia-500/15 border border-fuchsia-300/25">
                <div className="text-[10px] uppercase tracking-widest text-fuchsia-200 font-black mb-1">🛠️ How</div>
                <p onMouseEnter={() => speakOnHover(slide.howToUse)} className="text-xs">{slide.howToUse}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
