import { useEffect, useRef, useState } from "react";
import { Btn } from "./primitives";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

export default function RichEditor({ value, onChange, placeholder, className, minHeight = 80 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  function exec(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    onChange(ref.current?.innerHTML || "");
    ref.current?.focus();
  }

  async function pasteImage() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const t of item.types) {
          if (t.startsWith("image/")) {
            const blob = await item.getType(t);
            const reader = new FileReader();
            reader.onload = () => {
              insertImage(reader.result as string);
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      alert("No image in clipboard");
    } catch {
      alert("Clipboard read denied");
    }
  }

  function insertImage(src: string) {
    const html = `<img src="${src}" style="max-width:100%;height:auto;border-radius:10px;margin:6px 0" />`;
    exec("insertHTML", html);
  }

  function insertTable() {
    const html = `<table style="border-collapse:collapse;width:100%;margin:6px 0">
<tr><th style="border:1px solid #cbd5e1;padding:4px;background:#f1f5f9">Header</th><th style="border:1px solid #cbd5e1;padding:4px;background:#f1f5f9">Header</th></tr>
<tr><td style="border:1px solid #cbd5e1;padding:4px">Cell</td><td style="border:1px solid #cbd5e1;padding:4px">Cell</td></tr>
</table>`;
    exec("insertHTML", html);
  }

  async function insertGifUrl() {
    const url = prompt("GIF / Image URL");
    if (url) insertImage(url);
  }

  const emojis = ["😀","😂","🤣","😊","😍","🥰","😎","🤩","🤔","😴","🤗","🙄","😱","🥺","😭","😅","🤝","👍","👏","🙌","💪","🙏","🎉","🔥","💯","⭐","❤️","💙","💚","💜","🧡","🤍","👋","✋","👀","💡","📚","✏️","🎯","🏆","🎓","🌟","✨","🚀","💬","📝","🌍","🌈","☀️","🌙","⚡","🎵","🎶","🍎","☕","🐶","🐱","🦄","🦋"];

  return (
    <div className={"border border-slate-200 rounded-xl bg-white overflow-hidden " + (className || "")}>
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-slate-100 bg-slate-50/60">
        <ToolBtn onClick={() => exec("bold")} title="Bold"><b>B</b></ToolBtn>
        <ToolBtn onClick={() => exec("italic")} title="Italic"><i>I</i></ToolBtn>
        <ToolBtn onClick={() => exec("underline")} title="Underline"><u>U</u></ToolBtn>
        <ToolBtn onClick={() => exec("strikeThrough")} title="Strike"><s>S</s></ToolBtn>
        <span className="w-px h-4 bg-slate-200 mx-1" />
        <ToolBtn onClick={() => exec("formatBlock", "<h3>")} title="Heading">H</ToolBtn>
        <ToolBtn onClick={() => exec("insertUnorderedList")} title="List">•≡</ToolBtn>
        <ToolBtn onClick={() => exec("insertOrderedList")} title="Numbered">1.</ToolBtn>
        <ToolBtn onClick={() => exec("formatBlock", "<blockquote>")} title="Quote">❝</ToolBtn>
        <span className="w-px h-4 bg-slate-200 mx-1" />
        <ToolBtn onClick={insertTable} title="Table">⊞</ToolBtn>
        <ToolBtn onClick={pasteImage} title="Paste image from clipboard">📋🖼</ToolBtn>
        <ToolBtn onClick={insertGifUrl} title="Insert GIF/Image URL">GIF</ToolBtn>
        <span className="w-px h-4 bg-slate-200 mx-1" />
        <div className="relative">
          <ToolBtn onClick={() => setPickerOpen((v) => !v)} title="Emoji">😊</ToolBtn>
          {pickerOpen && (
            <div className="absolute z-50 top-full left-0 mt-1 w-72 max-h-60 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 grid grid-cols-10 gap-0.5">
              {emojis.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="text-lg hover:bg-slate-100 rounded p-1"
                  onClick={() => {
                    exec("insertText", e);
                    setPickerOpen(false);
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="flex-1" />
        <Btn
          size="sm"
          variant="ghost"
          onClick={() => {
            if (ref.current) ref.current.innerHTML = "";
            onChange("");
          }}
          title="Clear"
        >
          Clear
        </Btn>
      </div>
      <div
        ref={ref}
        className="px-3 py-2 text-sm text-slate-800 focus:outline-none prose prose-sm max-w-none"
        style={{ minHeight }}
        contentEditable
        data-placeholder={placeholder || "Type a message..."}
        onInput={() => onChange(ref.current?.innerHTML || "")}
        onPaste={async (e) => {
          const items = e.clipboardData?.items;
          if (!items) return;
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if (it.type.startsWith("image/")) {
              e.preventDefault();
              const file = it.getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = () => insertImage(reader.result as string);
                reader.readAsDataURL(file);
              }
              return;
            }
          }
        }}
        suppressContentEditableWarning
      />
      <style>{`[contenteditable][data-placeholder]:empty:before{content:attr(data-placeholder);color:#94a3b8;pointer-events:none;display:block}`}</style>
    </div>
  );
}

function ToolBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="px-2 py-1 text-xs rounded-md text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition"
    >
      {children}
    </button>
  );
}
