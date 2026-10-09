/**
 * Sticker and GIF packs.
 *
 * Nothing here is fetched from a CDN: a lesson can lose wifi, and a chatbox that
 * dies with it is worse than one with fewer pictures. Every "GIF" is a built-in
 * animated sticker drawn with emoji + CSS keyframes, and real GIF files or URLs
 * are supported alongside them (see the composer's GIF button).
 */

export type StickerAnim =
  | "st-bounce"
  | "st-spin"
  | "st-pulse"
  | "st-shake"
  | "st-tada"
  | "st-float"
  | "st-jelly"
  | "st-swing"
  | "st-fire"
  | "st-zoom";

export interface StickerDef {
  id: string;
  emoji: string;
  label: string;
  pack: StickerPackId;
  anim: StickerAnim;
  /** Animated stickers double as the built-in GIF pack. */
  gif?: boolean;
}

export type StickerPackId = "reactions" | "classroom" | "party" | "animals" | "gifs";

export interface StickerPack {
  id: StickerPackId;
  name: string;
  icon: string;
  /** Loop the animation forever — that is what makes the GIF pack feel like GIFs. */
  loop?: boolean;
}

export const STICKER_PACKS: StickerPack[] = [
  { id: "reactions", name: "Reactions", icon: "👍" },
  { id: "classroom", name: "Classroom", icon: "📚" },
  { id: "party", name: "Celebrate", icon: "🎉" },
  { id: "animals", name: "Animals", icon: "🐱" },
  { id: "gifs", name: "Animated GIFs", icon: "🎞️", loop: true },
];

const s = (id: string, emoji: string, label: string, pack: StickerPackId, anim: StickerAnim, gif = false): StickerDef => ({
  id,
  emoji,
  label,
  pack,
  anim,
  gif,
});

export const STICKERS: StickerDef[] = [
  // reactions
  s("like", "👍", "Nice work", "reactions", "st-bounce"),
  s("clap", "👏", "Applause", "reactions", "st-tada"),
  s("heart", "❤️", "Love it", "reactions", "st-pulse"),
  s("fire", "🔥", "On fire", "reactions", "st-fire"),
  s("hundred", "💯", "Perfect", "reactions", "st-zoom"),
  s("think", "🤔", "Thinking", "reactions", "st-swing"),
  s("laugh", "😂", "Very funny", "reactions", "st-shake"),
  s("wow", "😮", "Wow", "reactions", "st-zoom"),
  s("sad", "🥺", "Aww", "reactions", "st-float"),
  s("ok", "👌", "Got it", "reactions", "st-bounce"),
  s("pray", "🙏", "Thank you", "reactions", "st-swing"),
  s("muscle", "💪", "You can do it", "reactions", "st-jelly"),

  // classroom
  s("book", "📚", "Reading time", "classroom", "st-float"),
  s("pencil", "✏️", "Write this down", "classroom", "st-swing"),
  s("bulb", "💡", "Great idea", "classroom", "st-pulse"),
  s("target", "🎯", "On target", "classroom", "st-zoom"),
  s("trophy", "🏆", "Winner", "classroom", "st-tada"),
  s("grad", "🎓", "Graduate", "classroom", "st-bounce"),
  s("star", "⭐", "Gold star", "classroom", "st-spin"),
  s("rocket", "🚀", "Progress", "classroom", "st-fire"),
  s("check", "✅", "Correct", "classroom", "st-bounce"),
  s("question", "❓", "Question", "classroom", "st-shake"),
  s("clock", "⏰", "Time is up", "classroom", "st-swing"),
  s("note", "📝", "Homework", "classroom", "st-float"),

  // party
  s("party", "🎉", "Celebrate", "party", "st-tada"),
  s("balloon", "🎈", "Party time", "party", "st-float"),
  s("cake", "🎂", "Birthday", "party", "st-bounce"),
  s("gift", "🎁", "A gift", "party", "st-jelly"),
  s("sparkles", "✨", "Sparkle", "party", "st-pulse"),
  s("rainbow", "🌈", "Rainbow", "party", "st-swing"),
  s("music", "🎵", "Music", "party", "st-float"),
  s("dance", "💃", "Dance break", "party", "st-jelly"),
  s("pop", "🥳", "Yay!", "party", "st-tada"),
  s("heart-hands", "🫶", "Kindness", "party", "st-pulse"),

  // animals
  s("cat", "🐱", "Cat", "animals", "st-swing"),
  s("dog", "🐶", "Dog", "animals", "st-bounce"),
  s("owl", "🦉", "Wise owl", "animals", "st-pulse"),
  s("fox", "🦊", "Fox", "animals", "st-zoom"),
  s("panda", "🐼", "Panda", "animals", "st-jelly"),
  s("bee", "🐝", "Busy bee", "animals", "st-shake"),
  s("butterfly", "🦋", "Butterfly", "animals", "st-float"),
  s("unicorn", "🦄", "Unicorn", "animals", "st-spin"),
  s("dino", "🦖", "Dino", "animals", "st-shake"),
  s("penguin", "🐧", "Penguin", "animals", "st-jelly"),

  // animated "GIF" pack — looping motion, so they read as GIFs in a bubble
  s("gif-party", "🎊", "Confetti pop", "gifs", "st-tada", true),
  s("gif-fire", "🔥", "Fire loop", "gifs", "st-fire", true),
  s("gif-star", "🌟", "Twinkle", "gifs", "st-spin", true),
  s("gif-heart", "💖", "Heartbeat", "gifs", "st-pulse", true),
  s("gif-cat-dance", "😻", "Happy cat", "gifs", "st-jelly", true),
  s("gif-dog", "🐕", "Zoomies", "gifs", "st-bounce", true),
  s("gif-rocket", "🚀", "Blast off", "gifs", "st-zoom", true),
  s("gif-think", "🤯", "Mind blown", "gifs", "st-shake", true),
  s("gif-cool", "😎", "Too cool", "gifs", "st-swing", true),
  s("gif-clap", "👏", "Slow clap", "gifs", "st-tada", true),
  s("gif-rain", "🌧️", "Rain", "gifs", "st-float", true),
  s("gif-spin", "🌪️", "Tornado", "gifs", "st-spin", true),
];

export const GIF_STICKERS = STICKERS.filter((st) => st.gif);

/** Big emojis for the quick emoji bar — enough for a lesson, small enough to scan. */
export const QUICK_EMOJIS = [
  "😀", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤩", "🤔", "😴",
  "🙃", "😅", "😭", "😱", "🥺", "🙄", "🤗", "🤝", "👍", "👎",
  "👏", "🙌", "💪", "🙏", "✋", "👀", "🎉", "🔥", "💯", "⭐",
  "❤️", "💙", "💚", "💜", "✨", "🚀", "💡", "📚", "✏️", "🎯",
  "🏆", "🎓", "🌍", "🌈", "☀️", "🌙", "⚡", "🎵", "🍎", "☕",
];

export function stickerCss(): string {
  return `
@keyframes stBounce { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-16%) } }
@keyframes stSpin { 0% { transform: rotate(-14deg) } 50% { transform: rotate(14deg) } 100% { transform: rotate(-14deg) } }
@keyframes stPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.22) } }
@keyframes stShake { 0%,100% { transform: translateX(0) rotate(0) } 20% { transform: translateX(-9%) rotate(-7deg) } 60% { transform: translateX(9%) rotate(7deg) } }
@keyframes stTada { 0% { transform: scale(0.9) rotate(-6deg) } 40% { transform: scale(1.18) rotate(6deg) } 100% { transform: scale(0.9) rotate(-6deg) } }
@keyframes stFloat { 0%,100% { transform: translateY(0) rotate(-4deg) } 50% { transform: translateY(-12%) rotate(4deg) } }
@keyframes stJelly { 0%,100% { transform: scale(1,1) } 30% { transform: scale(1.14,0.9) } 55% { transform: scale(0.92,1.1) } 80% { transform: scale(1.06,0.97) } }
@keyframes stSwing { 0%,100% { transform: rotate(-12deg) } 50% { transform: rotate(12deg) } }
@keyframes stFire { 0%,100% { transform: scale(1) rotate(-3deg); filter: drop-shadow(0 0 0 rgba(249,115,22,0)) } 50% { transform: scale(1.16) rotate(3deg); filter: drop-shadow(0 0 10px rgba(249,115,22,.75)) } }
@keyframes stZoom { 0%,100% { transform: scale(0.94) translateY(2%) } 50% { transform: scale(1.16) translateY(-4%) } }
.sticker { display: inline-block; line-height: 1; animation-duration: 1.6s; animation-iteration-count: 1; animation-timing-function: ease-in-out; }
.sticker-loop { animation-iteration-count: infinite !important; }
.sticker:hover { animation-iteration-count: infinite !important; }
.st-bounce { animation-name: stBounce } .st-spin { animation-name: stSpin } .st-pulse { animation-name: stPulse }
.st-shake { animation-name: stShake } .st-tada { animation-name: stTada } .st-float { animation-name: stFloat }
.st-jelly { animation-name: stJelly } .st-swing { animation-name: stSwing } .st-fire { animation-name: stFire }
.st-zoom { animation-name: stZoom }
`;
}
