/**
 * Learners' first languages (L1) and the leaderboard name pools that go with them.
 *
 * The app lets the learner TYPE their first language as free text (any spelling,
 * any language). Everything that needs a language code — the league name pool,
 * the native-language label — resolves the typed text through `findLanguage`,
 * and falls back gracefully when the typed language is not in this list.
 */

export interface Language {
  code: string;
  name: string;
  /** Extra spellings the learner may type for this language. */
  aliases?: string[];
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English" },
  { code: "fa", name: "Persian (Farsi)", aliases: ["farsi", "parsi", "فارسی"] },
  { code: "ar", name: "Arabic", aliases: ["arabic"] },
  { code: "es", name: "Spanish", aliases: ["espanol", "español", "castellano"] },
  { code: "fr", name: "French", aliases: ["francais", "français"] },
  { code: "de", name: "German", aliases: ["deutsch"] },
  { code: "tr", name: "Turkish", aliases: ["turkce", "türkçe"] },
  { code: "ru", name: "Russian", aliases: ["russkiy"] },
  { code: "zh", name: "Chinese", aliases: ["mandarin", "simplified chinese"] },
  { code: "hi", name: "Hindi" },
  { code: "ur", name: "Urdu" },
  { code: "pt", name: "Portuguese", aliases: ["portugues", "português", "brazilian"] },
  { code: "it", name: "Italian", aliases: ["italiano"] },
  { code: "ja", name: "Japanese", aliases: ["nihongo"] },
  { code: "ko", name: "Korean", aliases: ["hangul"] },
  { code: "id", name: "Indonesian", aliases: ["bahasa", "bahasa indonesia"] },
  { code: "vi", name: "Vietnamese", aliases: ["tieng viet"] },
  { code: "th", name: "Thai" },
  { code: "uk", name: "Ukrainian" },
  { code: "pl", name: "Polish", aliases: ["polski"] },
  { code: "az", name: "Azerbaijani", aliases: ["azerbaijani turkish", "azeri"] },
  { code: "ku", name: "Kurdish", aliases: ["kurdi", "sorani"] },
  { code: "he", name: "Hebrew", aliases: ["ivrit"] },
  { code: "sw", name: "Swahili", aliases: ["kiswahili"] },
];

/**
 * Resolve whatever the learner typed (a language name, a native spelling or an
 * ISO code) into a known language. Returns null when nothing matches.
 */
export function findLanguage(text?: string): Language | null {
  const raw = (text ?? "").trim().toLowerCase();
  if (!raw) return null;

  const byCode = LANGUAGES.find((l) => l.code === raw);
  if (byCode) return byCode;

  const exact = LANGUAGES.find((l) => l.name.toLowerCase() === raw || l.aliases?.includes(raw));
  if (exact) return exact;

  if (raw.length < 3) return null; // avoid "a" matching everything
  return (
    LANGUAGES.find((l) => l.name.toLowerCase().startsWith(raw) || l.aliases?.some((a) => a.startsWith(raw))) ??
    LANGUAGES.find((l) => l.name.toLowerCase().includes(raw) || l.aliases?.some((a) => a.includes(raw))) ??
    null
  );
}

/** ISO code for whatever the learner typed, or null when it is not recognised. */
export function languageCode(text?: string): string | null {
  return findLanguage(text)?.code ?? null;
}

/**
 * Display name for an L1 value — accepts a code ("fa"), a known name
 * ("Farsi") or any free text ("Klingon"), and always returns something human.
 */
export function languageName(text?: string): string {
  const raw = (text ?? "").trim();
  if (!raw) return "English";
  const found = findLanguage(raw);
  if (found) return found.name;
  // Unknown language: show exactly what the learner typed.
  return raw.replace(/\s+/g, " ").slice(0, 40);
}

/**
 * The L1 actually in force: the learner's own text, or the content pack default
 * when the setting is empty/"auto".
 */
export function resolveL1(setting?: string, packL1?: string): string {
  const typed = (setting ?? "").trim();
  if (typed && typed.toLowerCase() !== "auto") return typed;
  const fromPack = (packL1 ?? "").trim();
  return fromPack || "en";
}

/**
 * The language that content-derived explanations are written in.
 *
 * The mini lessons, rule texts and translations shown in the app are copied out
 * of the content pack, so when the pack declares an L1 that is the truthful
 * label — even if the learner has since changed their profile setting. When the
 * pack declares nothing, the learner's own choice is used.
 */
export function contentL1Name(setting?: string, packL1?: string): string {
  const fromPack = (packL1 ?? "").trim();
  return fromPack ? languageName(fromPack) : languageName(resolveL1(setting, packL1));
}

/** True when the setting means "follow the content pack". */
export function isAutoL1(setting?: string): boolean {
  const t = (setting ?? "").trim();
  return !t || t.toLowerCase() === "auto";
}

const AVATARS = [
  "🦊", "🐼", "🐰", "🦁", "🐨", "🐯", "🐸", "🐵", "🦄", "🐝",
  "🦋", "🐺", "🐞", "🦅", "🐬", "🦉", "🐢", "🦀", "🐙", "🦖",
  "🌸", "⚽", "🎵", "🚀", "🌙", "🔥", "💫", "🎮", "🍀", "🐧",
];

/** 20 first names per language code, used for league opponents. */
const NAME_POOLS: Record<string, string[]> = {
  en: ["Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Mia", "Lucas", "Harper", "Mason", "Ella", "Logan", "Grace", "Owen", "Chloe", "Ryan", "Nora", "Miles", "Ruby", "Cole"],
  fa: ["Sara", "Ali", "Maryam", "Reza", "Negar", "Amir", "Zahra", "Hossein", "Fatemeh", "Mohammad", "Yasamin", "Arash", "Shirin", "Kian", "Elham", "Parsa", "Donya", "Ramin", "Samira", "Farhad"],
  ar: ["Layla", "Omar", "Nour", "Yousef", "Salma", "Khalid", "Mariam", "Tariq", "Hala", "Zayd", "Amina", "Bilal", "Rana", "Hamza", "Dina", "Samir", "Rania", "Faisal", "Jana", "Karim"],
  es: ["Lucía", "Mateo", "Sofía", "Diego", "Valentina", "Santiago", "Camila", "Javier", "Elena", "Andrés", "Isabela", "Pablo", "Marta", "Nicolás", "Paula", "Rubén", "Carmen", "Álvaro", "Nuria", "Iván"],
  fr: ["Chloé", "Lucas", "Émilie", "Hugo", "Camille", "Louis", "Manon", "Théo", "Léa", "Antoine", "Sarah", "Maxime", "Inès", "Julien", "Zoé", "Nicolas", "Clara", "Baptiste", "Juliette", "Romain"],
  de: ["Lena", "Jonas", "Marie", "Felix", "Anna", "Lukas", "Sophie", "Maximilian", "Julia", "Tim", "Laura", "Niklas", "Lea", "Paul", "Hannah", "Moritz", "Nina", "David", "Greta", "Simon"],
  tr: ["Elif", "Mert", "Zeynep", "Emre", "Ayşe", "Can", "Defne", "Kerem", "Selin", "Burak", "Melis", "Onur", "Esra", "Umut", "İrem", "Gökhan", "Nazlı", "Serkan", "Buse", "Tolga"],
  ru: ["Anastasia", "Dmitri", "Olga", "Sergei", "Elena", "Ivan", "Natalia", "Mikhail", "Ekaterina", "Andrei", "Tatiana", "Pavel", "Irina", "Nikolai", "Yulia", "Alexei", "Svetlana", "Viktor", "Polina", "Maxim"],
  zh: ["Li Wei", "Zhang Min", "Wang Fang", "Chen Jie", "Liu Yang", "Zhao Lei", "Sun Li", "Yang Hao", "Wu Xin", "Zhou Yun", "Xu Ming", "Guo Na", "Ma Qiang", "He Lan", "Lin Bo", "Song Ya", "Tang Rui", "Deng Hui", "Feng Kai", "Gao Yan"],
  hi: ["Aarav", "Ananya", "Rohan", "Priya", "Vikram", "Neha", "Arjun", "Kavya", "Rahul", "Isha", "Karan", "Meera", "Aditya", "Pooja", "Siddharth", "Divya", "Nikhil", "Riya", "Manish", "Tanvi"],
  ur: ["Ayesha", "Bilal", "Sana", "Usman", "Hina", "Faisal", "Zara", "Imran", "Rabia", "Tariq", "Mahira", "Adeel", "Nimra", "Kamran", "Areeba", "Shayan", "Iqra", "Nadeem", "Sadia", "Junaid"],
  pt: ["Mariana", "João", "Beatriz", "Pedro", "Luísa", "Rafael", "Catarina", "Bruno", "Inês", "Tiago", "Sofia", "André", "Helena", "Miguel", "Ana", "Rui", "Carolina", "Diogo", "Marta", "Gonçalo"],
  it: ["Giulia", "Marco", "Sofia", "Luca", "Chiara", "Matteo", "Alessia", "Davide", "Martina", "Simone", "Francesca", "Andrea", "Sara", "Lorenzo", "Elena", "Federico", "Valentina", "Riccardo", "Beatrice", "Tommaso"],
  ja: ["Haruto", "Yui", "Sota", "Aoi", "Ren", "Sakura", "Yuto", "Hina", "Kaito", "Mei", "Riku", "Akari", "Takumi", "Nanami", "Daiki", "Yuna", "Kenta", "Riko", "Shota", "Kanon"],
  ko: ["Ji-woo", "Min-jun", "Seo-yeon", "Do-yun", "Ha-eun", "Ji-ho", "Soo-ah", "Jun-seo", "Ye-jin", "Hyun-woo", "Na-eun", "Tae-yang", "Mi-so", "Sang-hoon", "Yu-na", "Jin-woo", "Hae-won", "Sung-min", "Da-eun", "Chan-ho"],
  id: ["Putri", "Budi", "Sari", "Agus", "Dewi", "Rizky", "Ayu", "Bayu", "Indah", "Fajar", "Lestari", "Andi", "Citra", "Hendra", "Ratna", "Yoga", "Melati", "Dimas", "Nabila", "Reza"],
  vi: ["Linh", "Minh", "Trang", "Quang", "Hương", "Tuấn", "Mai", "Dũng", "Thảo", "Khánh", "Ngọc", "Bảo", "Hà", "Phúc", "Chi", "Nam", "Yến", "Khoa", "Trâm", "Huy"],
  th: ["Somchai", "Ploy", "Nattapong", "Kanya", "Anan", "Pim", "Chai", "Mali", "Sarawut", "Napha", "Kittisak", "View", "Teerapat", "Noon", "Wichai", "Fah", "Arthit", "Praew", "Thanakorn", "Bua"],
  uk: ["Oksana", "Andriy", "Iryna", "Bohdan", "Kateryna", "Taras", "Olena", "Dmytro", "Yuliya", "Mykola", "Sofiia", "Petro", "Halyna", "Oleh", "Mariya", "Yaroslav", "Nadia", "Serhiy", "Vira", "Maksym"],
  pl: ["Zuzanna", "Jakub", "Anna", "Kacper", "Zofia", "Szymon", "Maja", "Antoni", "Lena", "Filip", "Julia", "Michał", "Aleksandra", "Piotr", "Emilia", "Wojciech", "Natalia", "Krzysztof", "Wiktoria", "Paweł"],
  az: ["Aysel", "Elvin", "Nərmin", "Rəşad", "Günel", "Tural", "Leyla", "Orxan", "Aytac", "Kamran", "Fidan", "Elçin", "Nigar", "Vüsal", "Aynur", "Ramil", "Səbinə", "Fuad", "Ülviyyə", "Rəvan"],
  ku: ["Rojin", "Azad", "Berfin", "Hêmin", "Dilovan", "Sirwan", "Narin", "Diyar", "Jiyan", "Baran", "Evin", "Şivan", "Rojda", "Karwan", "Havin", "Aras", "Zelal", "Bahoz", "Ronak", "Aram"],
  he: ["Noa", "David", "Yael", "Eitan", "Shira", "Ariel", "Tamar", "Yonatan", "Maya", "Oren", "Roni", "Amit", "Lior", "Yossi", "Adi", "Itai", "Michal", "Gilad", "Shani", "Nadav"],
  sw: ["Amina", "Juma", "Neema", "Baraka", "Zawadi", "Musa", "Rehema", "Tuma", "Amani", "Faraja", "Jabari", "Imani", "Nuru", "Bahati", "Asha", "Zuberi", "Halima", "Omari", "Subira", "Kito"],
};

const DEFAULT_POOL = ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Robin", "Jamie", "Morgan", "Avery", "Riley", "Quinn", "Charlie", "Dana", "Ellis", "Frankie", "Harper", "Kai", "Logan", "Nova", "Skyler"];

function poolFor(l1: string): string[] {
  const typed = (l1 ?? "").trim();
  const code = findLanguage(typed)?.code ?? typed.toLowerCase();
  return NAME_POOLS[code] ?? DEFAULT_POOL;
}

export interface LeagueOpponent {
  name: string;
  avatar: string;
}

/**
 * Deterministic league board for a given L1: the same learner always sees the
 * same names for the same week, so the board feels stable. A language that is
 * not in the pools simply falls back to international names.
 */
export function leagueOpponents(l1: string, weekSeed: number): LeagueOpponent[] {
  const pool = poolFor(l1);
  const offset = Math.abs(Math.floor(Math.sin(weekSeed * 7.13) * 10000)) % pool.length;
  return pool.map((_, i) => {
    const name = pool[(i + offset) % pool.length];
    const avatar = AVATARS[(i * 3 + offset) % AVATARS.length];
    return { name, avatar };
  });
}

export function poolSize(l1: string): number {
  return poolFor(l1).length;
}

/** True when the typed language has a dedicated name pool. */
export function hasNamePool(l1: string): boolean {
  return poolFor(l1) !== DEFAULT_POOL;
}
