import type { LangCode, Translations } from "./types";

export type CcqKind = "yesno" | "choice" | "do" | "open";

export type Ccq = {
  id: string;
  kind: CcqKind;
  /** optional answer options for choice questions, keyed to word fields */
  answers?: { key: "big" | "small"; t: Translations }[];
  t: Translations;
  /** tutor hint, English only */
  hint: string;
};

export const CCQS: Ccq[] = [
  {
    id: "say",
    kind: "do",
    t: {
      en: "Can you say “{w}”?",
      zh: "你能说“{w}”吗？",
      fr: "Peux-tu dire « {w} » ?",
      it: "Sai dire “{w}”?",
      de: "Kannst du „{w}“ sagen?",
      tr: "“{w}” söyleyebilir misin?",
    } as Record<LangCode, string>,
    hint: "Model it first, then wait 5 seconds. Any attempt = a star.",
  },
  {
    id: "isit",
    kind: "yesno",
    t: {
      en: "Is this {w}?",
      zh: "这是 {w} 吗？",
      fr: "C'est {w} ?",
      it: "È {w}?",
      de: "Ist das {w}?",
      tr: "Bu {w} mı?",
    } as Record<LangCode, string>,
    hint: "Show the right picture → child says YES. Show a silly wrong one → NO!",
  },
  {
    id: "like",
    kind: "yesno",
    t: {
      en: "Do you like {w}?",
      zh: "你喜欢 {w} 吗？",
      fr: "Tu aimes {w} ?",
      it: "Ti piace {w}?",
      de: "Magst du {w}?",
      tr: "{w} sever misin?",
    } as Record<LangCode, string>,
    hint: "Answer in a full sentence: “Yes, I like …” / “No, I don't like …”.",
  },
  {
    id: "see",
    kind: "yesno",
    t: {
      en: "Can you see {w}?",
      zh: "你能看到 {w} 吗？",
      fr: "Tu vois {w} ?",
      it: "Vedi {w}?",
      de: "Siehst du {w}?",
      tr: "{w} görüyor musun?",
    } as Record<LangCode, string>,
    hint: "Ask the child to point at the screen, then say the word.",
  },
  {
    id: "where",
    kind: "open",
    t: {
      en: "Where is {w}?",
      zh: "{w} 在哪里？",
      fr: "Où est {w} ?",
      it: "Dov'è {w}?",
      de: "Wo ist {w}?",
      tr: "{w} nerede?",
    } as Record<LangCode, string>,
    hint: "Perfect for drag & drop: “Put {w} in the box!”",
  },
  {
    id: "colour",
    kind: "open",
    t: {
      en: "What colour is {w}?",
      zh: "{w} 是什么颜色？",
      fr: "De quelle couleur est {w} ?",
      it: "Di che colore è {w}?",
      de: "Welche Farbe hat {w}?",
      tr: "{w} ne renk?",
    } as Record<LangCode, string>,
    hint: "Accept one word answers, then expand: “Yes! It's red!”",
  },
  {
    id: "size",
    kind: "choice",
    answers: [
      { key: "big", t: { en: "big", zh: "大", fr: "grand", it: "grande", de: "groß", tr: "büyük" } as Record<LangCode, string> },
      { key: "small", t: { en: "small", zh: "小", fr: "petit", it: "piccolo", de: "klein", tr: "küçük" } as Record<LangCode, string> },
    ],
    t: {
      en: "Is {w} big or small?",
      zh: "{w} 是大的还是小的？",
      fr: "{w} est grand ou petit ?",
      it: "{w} è grande o piccolo?",
      de: "Ist {w} groß oder klein?",
      tr: "{w} büyük mü küçük mü?",
    } as Record<LangCode, string>,
    hint: "Use your hands! Big = arms wide, small = tiny fingers.",
  },
  {
    id: "show",
    kind: "do",
    t: {
      en: "Can you show me {w}?",
      zh: "你能给我看 {w} 吗？",
      fr: "Montre-moi {w} !",
      it: "Mostrami {w}!",
      de: "Zeig mir {w}!",
      tr: "Bana {w} göster!",
    } as Record<LangCode, string>,
    hint: "Child points, mimes, or draws it on the shared screen.",
  },
  {
    id: "act",
    kind: "do",
    t: {
      en: "Can you act like {w}?",
      zh: "你能学 {w} 吗？",
      fr: "Fais comme {w} !",
      it: "Fai come {w}!",
      de: "Mach es wie {w}!",
      tr: "{w} gibi yap!",
    } as Record<LangCode, string>,
    hint: "Total physical response: jump, run, sleep, roar…",
  },
  {
    id: "sound",
    kind: "open",
    t: {
      en: "What sound does {w} make?",
      zh: "{w} 怎么叫？",
      fr: "Quel bruit fait {w} ?",
      it: "Che verso fa {w}?",
      de: "Wie macht {w}?",
      tr: "{w} nasıl ses çıkarır?",
    } as Record<LangCode, string>,
    hint: "Only for animals / vehicles — press the sound button first.",
  },
  {
    id: "count",
    kind: "open",
    t: {
      en: "How many {w}? Let's count!",
      zh: "有多少个 {w}？我们一起数！",
      fr: "Combien de {w} ? On compte !",
      it: "Quanti {w}? Contiamo!",
      de: "Wie viele {w}? Wir zählen!",
      tr: "Kaç tane {w}? Sayalım!",
    } as Record<LangCode, string>,
    hint: "Count slowly, one tap per object.",
  },
  {
    id: "turn",
    kind: "do",
    t: {
      en: "{w}! Now it's your turn!",
      zh: "{w}！现在轮到你了！",
      fr: "{w} ! À ton tour !",
      it: "{w}! Adesso tocca a te!",
      de: "{w}! Jetzt bist du dran!",
      tr: "{w}! Şimdi sıra sende!",
    } as Record<LangCode, string>,
    hint: "Say the word, then mute yourself and wait. Silence = speaking time.",
  },
];

export type ChantTemplate = {
  id: string;
  /** which words it suits best */
  fits: "all" | "verbs" | "food" | "animals";
  lines: Translations[];
};

export const CHANT_TEMPLATES: ChantTemplate[] = [
  {
    id: "sayit",
    fits: "all",
    lines: [
      { en: "{w}, {w}, {w}!", zh: "{w}，{w}，{w}！", fr: "{w}, {w}, {w} !", it: "{w}, {w}, {w}!", de: "{w}, {w}, {w}!", tr: "{w}, {w}, {w}!" },
      { en: "I can say {w}!", zh: "我会说 {w}！", fr: "Je peux dire {w} !", it: "So dire {w}!", de: "Ich kann {w} sagen!", tr: "{w} söyleyebilirim!" },
      { en: "Can you say {w}?", zh: "你会说 {w} 吗？", fr: "Peux-tu dire {w} ?", it: "Sai dire {w}?", de: "Kannst du {w} sagen?", tr: "{w} söyleyebilir misin?" },
      { en: "{w}, {w}, yes yes yes!", zh: "{w}，{w}，对对对！", fr: "{w}, {w}, oui oui oui !", it: "{w}, {w}, sì sì sì!", de: "{w}, {w}, ja ja ja!", tr: "{w}, {w}, evet evet!" },
    ] as Translations[],
  },
  {
    id: "ilike",
    fits: "food",
    lines: [
      { en: "I like {w}, yes I do!", zh: "我喜欢 {w}，真的！", fr: "J'aime {w}, oui oui oui !", it: "Mi piace {w}, sì sì sì!", de: "Ich mag {w}, ja ja ja!", tr: "{w} severim, evet evet!" },
      { en: "I like {w}, how about you?", zh: "我喜欢 {w}，你呢？", fr: "J'aime {w}, et toi ?", it: "Mi piace {w}, e a te?", de: "Ich mag {w}, und du?", tr: "{w} severim, ya sen?" },
      { en: "{w}, {w}, yum yum yum!", zh: "{w}，{w}，好吃好吃好吃！", fr: "{w}, {w}, miam miam miam !", it: "{w}, {w}, gnam gnam gnam!", de: "{w}, {w}, lecker, lecker!", tr: "{w}, {w}, nefis nefis!" },
      { en: "Yummy {w} every day!", zh: "每天都是好吃的 {w}！", fr: "Miam, {w} tous les jours !", it: "Che buono, {w} ogni giorno!", de: "Lecker, {w} jeden Tag!", tr: "Her gün {w}, çok güzel!" },
    ] as Translations[],
  },
  {
    id: "findit",
    fits: "all",
    lines: [
      { en: "Where is {w}? Where is {w}?", zh: "{w} 在哪里？{w} 在哪里？", fr: "Où est {w} ? Où est {w} ?", it: "Dov'è {w}? Dov'è {w}?", de: "Wo ist {w}? Wo ist {w}?", tr: "{w} nerede? {w} nerede?" },
      { en: "Here it is! Here it is!", zh: "在这里！在这里！", fr: "Le voici ! Le voici !", it: "Eccolo qui! Eccolo qui!", de: "Hier ist es! Hier ist es!", tr: "İşte burada! İşte burada!" },
      { en: "I can see {w}, yes I can!", zh: "我能看到 {w}，我能！", fr: "Je vois {w}, oui je vois !", it: "Vedo {w}, sì lo vedo!", de: "Ich sehe {w}, ja ich sehe!", tr: "{w} görüyorum, evet!" },
      { en: "Can you see it? Show me now!", zh: "你能看到吗？快指给我看！", fr: "Tu le vois ? Montre-moi !", it: "Lo vedi? Mostrami!", de: "Siehst du es? Zeig mir!", tr: "Görüyor musun? Göster bana!" },
    ] as Translations[],
  },
  {
    id: "move",
    fits: "verbs",
    lines: [
      { en: "Can you {w}? Yes I can!", zh: "你会 {w} 吗？我会！", fr: "Tu peux {w} ? Oui je peux !", it: "Sai {w}? Sì, io so!", de: "Kannst du {w}? Ja ich kann!", tr: "{w} yapabilir misin? Evet!" },
      { en: "{w}, {w}, do it with me!", zh: "{w}，{w}，和我一起做！", fr: "{w}, {w}, fais comme moi !", it: "{w}, {w}, fai con me!", de: "{w}, {w}, mach es mit!", tr: "{w}, {w}, benimle yap!" },
      { en: "Faster, faster, one two three!", zh: "快快快，一二三！", fr: "Plus vite, un deux trois !", it: "Più veloce, un due tre!", de: "Schneller, eins zwei drei!", tr: "Daha hızlı, bir iki üç!" },
      { en: "Now stop! And sit with me.", zh: "现在停！和我一起坐下。", fr: "Et stop ! Assieds-toi.", it: "E stop! Siediti con me.", de: "Und Stopp! Setz dich.", tr: "Ve dur! Benimle otur." },
    ] as Translations[],
  },
];

/** fills {w} in any template string */
export function fill(text: string, w: string): string {
  return text.replaceAll("{w}", w);
}
