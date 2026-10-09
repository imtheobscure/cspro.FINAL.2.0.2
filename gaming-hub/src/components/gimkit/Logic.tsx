import React from "react";

export function Logic({ title, body, emoji }: { title: string; body: string; emoji: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white/10 border border-white/15">
      <div className="flex items-center gap-2 mb-1"><span className="text-3xl">{emoji}</span><h3 className="font-black text-lg">{title}</h3></div>
      <p className="text-sm text-white/75">{body}</p>
    </div>
  );
}

