import { useState } from "react";
import { cn } from "../utils/cn";
import { GIF_STICKERS, QUICK_EMOJIS, STICKERS, STICKER_PACKS, stickerCss, type StickerDef, type StickerPackId } from "./stickers";

/** Shared popover shell so every picker behaves the same (and closes on outside click). */
export function Popover({ onClose, children, className }: { onClose: () => void; children: React.ReactNode; className?: string }) {
  return (
    <>
      <div className="fixed inset-0 z-[70]" onClick={onClose} />
      <div className={cn("absolute bottom-full left-0 z-[71] mb-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl", className)}>{children}</div>
    </>
  );
}

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="w-72 max-h-56 overflow-y-auto">
      <div className="grid grid-cols-10 gap-0.5">
        {QUICK_EMOJIS.map((e) => (
          <button key={e} type="button" className="rounded-md p-1 text-lg hover:bg-slate-100" onClick={() => onPick(e)}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StickerPicker({ onPick, onSendGifFile }: { onPick: (st: StickerDef) => void; onSendGifFile?: () => void }) {
  const [pack, setPack] = useState<StickerPackId>("reactions");
  const list = STICKERS.filter((st) => st.pack === pack);
  return (
    <div className="w-full">
      <style>{stickerCss()}</style>
      <div className="mb-1.5 flex items-center gap-1">
        {STICKER_PACKS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPack(p.id)}
            className={cn("rounded-lg px-2 py-1 text-[11px] font-semibold transition", pack === p.id ? "bg-indigo-500 text-white" : "text-slate-600 hover:bg-slate-100")}
            title={p.name}
          >
            {p.icon} {p.name}
          </button>
        ))}
      </div>
      <div className="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto">
        {list.map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => onPick(st)}
            title={st.label}
            className="grid h-11 place-items-center rounded-lg hover:bg-slate-100"
          >
            <span className={cn("sticker", st.anim)} style={{ fontSize: 26 }}>
              {st.emoji}
            </span>
          </button>
        ))}
      </div>
      {onSendGifFile && (
        <button type="button" onClick={onSendGifFile} className="mt-1.5 w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50">
          🎞 Send a real GIF file from this computer
        </button>
      )}
    </div>
  );
}

/** The GIF tab: built-in animated stickers first, then a real GIF file or URL. */
export function GifPicker({ onPick, onPickFile, onPickUrl }: { onPick: (st: StickerDef) => void; onPickFile: () => void; onPickUrl: (url: string) => void }) {
  const [url, setUrl] = useState("");
  return (
    <div className="w-full">
      <style>{stickerCss()}</style>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Animated stickers</div>
      <div className="grid max-h-44 grid-cols-5 gap-1 overflow-y-auto">
        {GIF_STICKERS.map((st) => (
          <button key={st.id} type="button" onClick={() => onPick(st)} title={st.label} className="grid h-12 place-items-center rounded-lg hover:bg-slate-100">
            <span className={cn("sticker sticker-loop", st.anim)} style={{ fontSize: 28 }}>
              {st.emoji}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
        <button type="button" onClick={onPickFile} className="w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50">
          📁 Send a GIF from this computer
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (url.trim()) onPickUrl(url.trim());
            setUrl("");
          }}
          className="flex gap-1"
        >
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="…or paste a GIF / image URL"
            className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] focus:border-indigo-400 focus:outline-none"
          />
          <button type="submit" className="rounded-lg bg-indigo-500 px-2 py-1 text-[11px] font-semibold text-white">
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
