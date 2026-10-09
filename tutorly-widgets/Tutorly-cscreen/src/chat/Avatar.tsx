import { avatarForName } from "../lib/avatars";
import { cn } from "../utils/cn";

/**
 * The circular character photo.
 *
 * Every place a character appears — chat bubbles, the participant strip, the
 * people list, the typing indicator — uses this one component, so a character is
 * always the same round photo, and `ring` is always how "this one is speaking"
 * is shown.
 *
 * A character is always a real person, so when no photo was handed in we resolve
 * one from the name instead of drawing a letter. Old rooms, a guest name nobody
 * added to the roster, a quick `@someone` mention: all get a photograph, and the
 * same photograph every time.
 */
export function Avatar({
  name,
  avatar,
  size = 32,
  ring,
  speaking,
  className,
}: {
  name?: string;
  avatar?: string;
  size?: number;
  ring?: boolean;
  speaking?: boolean;
  className?: string;
}) {
  const label = (name || "?").trim();
  const photo = avatar || (label && label !== "?" ? avatarForName(label) : undefined);
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-bold flex-shrink-0 border-2 border-white shadow-sm",
        ring && "ring-2 ring-emerald-400",
        speaking && "animate-pulse",
        className,
      )}
      title={label}
    >
      {photo ? (
        <img src={photo} alt={label} className="w-full h-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.42 }}>{label.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

export default Avatar;
