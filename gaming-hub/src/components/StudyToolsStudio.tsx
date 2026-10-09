import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { SuitePlayersTab, type Player } from "./SuitePlayersTab";
import { SuiteLeaderboard } from "./SuiteLeaderboard";
import { SuitePromptTab } from "./SuitePromptTab";
import { CulturalSnapshot } from "./study-tools/CulturalSnapshot";
import { FlashcardsTool } from "./study-tools/FlashcardsTool";
import { FlexcardsTool } from "./study-tools/FlexcardsTool";
import { GamifiedSentenceBuilder } from "./study-tools/GamifiedSentenceBuilder";
import { GrammarlyAngelsDemons } from "./study-tools/GrammarlyAngelsDemons";
import { MadlibsTool } from "./study-tools/MadlibsTool";

interface Props {
  initialTool: "flashcards" | "flexcards" | "timeline" | "cloze" | "progress";
  onBack: () => void;
}

interface SItem {
  id: string; front: string; back: string; example: string; ccq: string;
  pronunciation: string; image: string; date: string; zoomLevel: string;
  causeEffect: string; sentence: string; clozeTarget: string; synonymHint: string;
  challenge?: string; joke?: string; song?: string; movie?: string; usage?: string;
  register?: { slang: string; casual: string; informal: string; neutral: string; formal: string; };
  category?: string; // used for flexcards / sorting
}
interface SLesson { title: string; color: string; image: string; body: string; examples: string[]; whenToUse: string; whereToUse: string; howToUse: string; }
interface SPost { id: string; image: string; author: string; location: string; time: string; caption: string; likes: number; comments: { user: string; text: string }[]; fact: string; translation: string; pronunciation: string; culturalNotes: string; challenge: string; questions?: { question: string; options: string[]; answer: string; }[]; }
interface SAngel { id: string; text: string; status: "pending" | "approved" | "rejected" | "student_found"; }
interface SDemon { id: string; text: string; correction: string; status: "pending" | "approved" | "rejected" | "student_found"; }
interface SMadlibBlank { id: string; type: string; label: string; suggestions: string[]; }
interface SMadlibTemplate { id: string; theme: string; title: string; templateText: string; blanks: SMadlibBlank[]; reflectionQuestions: string[]; }

interface SPayload { 
  title: string; 
  topic: string; 
  level: string; 
  backgroundImage: string; 
  musicKeyword: string; 
  imageKeywords: string[]; 
  items?: SItem[]; 
  lessons?: SLesson[]; 
  posts?: SPost[];
  studentText?: string;
  angels?: SAngel[];
  demons?: SDemon[];
  madlibs?: SMadlibTemplate[];
}

const SAMPLE: SPayload = {
  title: "Cellular Anatomy Master Set", topic: "Cytology", level: "B1-B2",
  backgroundImage: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1600",
  musicKeyword: "ambient laboratory focus", imageKeywords: ["microscope cells", "DNA helix"],
  items: [
    { id:"cell", front:"Cell", back:"The fundamental structural and functional unit of life.", example:"When you scrape your knee, billions of cells replicate to repair the wound.", ccq:"Can a cell exist outside of a living organism?", pronunciation:"/sɛl/", image:"https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=900", date:"1665", zoomLevel:"century", causeEffect:"Hooke coining 'cell' enabled cytology.", sentence:"The ___ is the smallest unit of life.", clozeTarget:"cell", synonymHint:"basic unit" },
    { id:"nuc", front:"Nucleus", back:"Membrane-enclosed organelle storing DNA.", example:"Your nucleus contains 2m of DNA folded into a pinhead.", ccq:"If a cell loses its nucleus, can it still divide?", pronunciation:"/ˈnu·kli·əs/", image:"https://images.unsplash.com/photo-1576086213369-97a306d36557?w=900", date:"1831", zoomLevel:"year", causeEffect:"Enabled DNA research.", sentence:"DNA is in the ___.", clozeTarget:"nucleus", synonymHint:"control center" },
    { id:"mit", front:"Mitochondria", back:"Organelles generating ATP energy.", example:"Athletes' muscle cells contain dramatically more mitochondria.", ccq:"Can a cell function without mitochondria?", pronunciation:"/ˌmaɪ·tə·ˈkɒn·dri·ə/", image:"https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=900", date:"1857", zoomLevel:"year", causeEffect:"Enabled metabolism science.", sentence:"ATP is made in the ___.", clozeTarget:"mitochondria", synonymHint:"powerhouse" },
    { id:"rib", front:"Ribosome", back:"Machine that synthesizes proteins.", example:"Antibiotics like erythromycin jam bacterial ribosomes.", ccq:"Are ribosomes only in eukaryotes?", pronunciation:"/ˈraɪ·bə·soʊm/", image:"https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=900", date:"1955", zoomLevel:"year", causeEffect:"Enabled antibiotic design.", sentence:"Proteins assemble at the ___.", clozeTarget:"ribosome", synonymHint:"protein factory" },
  ],
  lessons: [
    { title:"What Is a Cell?", color:"blue", image:"https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1200", body:"A cell is the smallest unit of life. Every living thing is built from cells.", examples:["Single-celled amoeba", "Trillions of cells in humans"], whenToUse:"When describing organism structure.", whereToUse:"Biology, lab reports, medicine.", howToUse:"State eukaryotic vs prokaryotic, then describe structures." },
    { title:"Inside the Nucleus", color:"purple", image:"https://images.unsplash.com/photo-1576086213369-97a306d36557?w=1200", body:"Stores DNA and directs gene expression. Surrounded by double membrane with nuclear pores.", examples:["DNA on histones", "mRNA exiting pores"], whenToUse:"Discussing genetics or division.", whereToUse:"Genetics, medical research.", howToUse:"Pair with DNA mention. Note red blood cells lack nuclei." },
    { title:"Mitochondria — Power Plants", color:"amber", image:"https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200", body:"Convert glucose + oxygen into ATP. They have their own maternally-inherited DNA.", examples:["Athlete muscle cells", "Beating heart cells"], whenToUse:"Energy and metabolism topics.", whereToUse:"Sports science, mitochondrial diseases.", howToUse:"Connect density to energy demand. Mention endosymbiotic theory." },
  ],
  posts: [
    { id: "p1", image: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800", author: "@science_daily", location: "Lab 4B", time: "3 hours ago", caption: "Just saw my first cell dividing under the microscope! #biology #mitosis", likes: 842, comments: [{ user: "@biology_nerd", text: "Incredible, aren't they?" }, { user: "@student2024", text: "Is that a cheek cell?" }], fact: "Our bodies contain around 30 trillion cells.", translation: "Las células son la unidad básica de la vida.", pronunciation: "/sɛl/", culturalNotes: "Cell biology is foundational across all modern medicine.", challenge: "Identify 3 things in your room that are made of cells." }
  ],
  studentText: "The mitochondrias is very important for the cell because they makes energy.",
  angels: [
    { id: "a1", text: "Good use of 'important' to describe its core function.", status: "pending" }
  ],
  demons: [
    { id: "d1", text: "Plural of mitochondria is mitochondria (already plural) or mitochondrion (singular).", correction: "mitochondria", status: "pending" },
    { id: "d2", text: "Subject-verb agreement error with 'they makes'.", correction: "they make", status: "pending" }
  ],
  madlibs: [
    {
      id: "ml1",
      theme: "Sci-fi",
      title: "The Great Space Escape",
      templateText: "In the distant future, a brave {1} had to {2} away from the giant {3}. It was a {4} day for the galaxy.",
      blanks: [
         { id: "1", type: "person", label: "A person's name", suggestions: ["Commander", "Pilot"] },
         { id: "2", type: "verb", label: "Action verb", suggestions: ["run", "fly", "jump"] },
         { id: "3", type: "noun", label: "A weird object", suggestions: ["rock", "alien", "starship"] },
         { id: "4", type: "adjective", label: "Descriptive word", suggestions: ["scary", "beautiful", "dangerous"] }
      ],
      reflectionQuestions: [
         "How did your adjective choice change the mood?",
         "What other action verbs could fit the escape?"
      ]
    }
  ]
};

const COMMON_PROMPT_RULES = `
NON-NEGOTIABLE RULES
- Return JSON ONLY based on the exact schema provided.
- NO markdown, NO code block formatting (like \`\`\`json), NO comments, NO extra text.
- Must follow the specific Learner Name, English CEFR level, and Facts to personalize language.
- Provide a robust premium high-quality teaching experience structure.
`;

const PROMPT_FLASHCARDS = `You are an elite curriculum designer creating a Premium Study Suite JSON payload for Flashcards.

GOAL: Build a high-fidelity active-recall set with rich examples, CCQ (Concept Check Questions), and elaborate teacher slides based on the lesson text provided.

${COMMON_PROMPT_RULES}
- Analyze the text below and extract 12-15 core vocabulary words/concepts.
- Each item must have rich examples, phonetic pronunciation, challenges, and register variations.
- Must provide 5 elaborate teacher slide lessons based on the broad topic.

SCHEMA:
{
  "title": "...", "topic": "...", "level": "CEFR/grade", "backgroundImage": "https://images.unsplash.com/photo-...", "musicKeyword": "...", "imageKeywords": ["..."],
  "items": [ { "id":"id", "front":"term", "back":"definition", "example":"personalized example", "ccq":"concept check question", "pronunciation":"/IPA/", "image":"https://images.unsplash.com/photo-...", "date":"YYYY", "zoomLevel":"century|year|day", "causeEffect":"...", "sentence":"Cloze with ___", "clozeTarget":"word", "synonymHint":"hint", "challenge":"e.g. go grab an apple", "joke":"joke", "song":"song reference", "movie":"movie quote", "usage":"usage notes", "register": { "slang":"...", "casual":"...", "informal":"...", "neutral":"...", "formal":"..." } } ],
  "lessons": [ { "title":"...", "color":"blue|purple|amber|green|red", "image":"https://images.unsplash.com/photo-...", "body":"teacher script", "examples":["..."], "whenToUse":"...", "whereToUse":"...", "howToUse":"..." } ]
}

INPUT DATA:
LEARNER NAME: [PASTE LEARNER NAME]
LEARNER CEFR: [PASTE LEVEL]
LEARNER FACTS: [PASTE LEARNER FACTS]
LESSON TEXT: [PASTE TEXT/WRITING]`;

const PROMPT_FLEXCARDS = `You are an elite linguistic designer creating a Premium JSON payload for Flexcards (Categorizable word cards).

GOAL: Generate 20+ words/phrases mapped to specific categories for deep semantic linking. Include slides.

${COMMON_PROMPT_RULES}
- Categories might be e.g. "Formal", "Informal", "Verbs", "Adjectives", "Positive", "Negative".
- Provide the "category" field for each item properly.

SCHEMA is identical to Flashcards, but ensure each item has a "category" string.
{
  "title": "...", "topic": "...", "level": "CEFR", "backgroundImage": "...", "musicKeyword": "...", "imageKeywords": ["..."],
  "items": [ { "id":"...", "front":"...", "back":"...", "example":"...", "ccq":"...", "pronunciation":"...", "image":"...", "date":"...", "zoomLevel":"...", "causeEffect":"...", "sentence":"...", "clozeTarget":"...", "synonymHint":"...", "category": "YOUR CATEGORY NAME", "register": {...} } ],
  "lessons": [ {...} ]
}

INPUT DATA:
LEARNER NAME: [PASTE LEARNER NAME]
LEARNER CEFR: [PASTE LEVEL]
LEARNER FACTS: [PASTE LEARNER FACTS]
LESSON TEXT: [PASTE TEXT/WRITING]`;

const PROMPT_SENTENCE = `You are a syntax architect crafting a Gamified Sentence Builder JSON payload.

GOAL: Break down 10-15 complex sentences from the text into grammatical chunks (clozeTarget = the chunk/word), where the user reconstructs sentences based on synonym hints.

${COMMON_PROMPT_RULES}
- The "sentence" field must contain the full sentence broken with ___. 
- The "clozeTarget" is what goes into the ___.
- Create 10-15 items.

SCHEMA:
{
  "title": "...", "topic": "...", "level": "...", "backgroundImage": "...", "musicKeyword": "...", "imageKeywords": ["..."],
  "items": [ { "id":"...", "front":"Grammar Focus", "back":"Explanation of grammar", "example":"...", "ccq":"...", "pronunciation":"", "image":"...", "date":"", "zoomLevel":"", "causeEffect":"", "sentence":"She ___ to the store.", "clozeTarget":"went", "synonymHint":"past tense of go", "register": {...} } ],
  "lessons": [ {...} ]
}

INPUT DATA:
LEARNER NAME: [PASTE LEARNER NAME]
LEARNER CEFR: [PASTE LEVEL]
LEARNER FACTS: [PASTE LEARNER FACTS]
LESSON TEXT: [PASTE TEXT/WRITING]`;

const PROMPT_MADLIBS = `You are a creative writer generating a Madlibs interactive storytelling JSON payload.

GOAL: Create a robust set of 20+ story templates covering various themes (e.g. Horror, Sci-fi, Romance, Funny, Fantasy, Pirate, etc.). Each story should have between 7-15 blanks (variables). Provide deep reflective questions about the word choices.

${COMMON_PROMPT_RULES}
- Include at least 20 themes in the "madlibs" array.
- In "templateText", use brackets for blanks, e.g., "{1}", "{2}".
- "blanks" must align with the template. Typical types: "noun", "verb past tense", "person", "place", "adjective".
- "reflectionQuestions" must ask why certain words were chosen and how they affect mood.

SCHEMA:
{
  "title": "Madlibs Story Collection", "topic": "Storytelling", "level": "...", "backgroundImage": "...", "musicKeyword": "...", "imageKeywords": ["..."],
  "madlibs": [
    {
      "id": "ml_1",
      "theme": "Sci-fi",
      "title": "Escape from Mars",
      "templateText": "The brave {1} decided to {2} across the surface of Mars. Suddenly, a wild {3} appeared!",
      "blanks": [
        { "id": "1", "type": "person", "label": "A hero's name", "suggestions": ["Commander", "Pilot", "Explorer"] },
        { "id": "2", "type": "verb", "label": "Action verb", "suggestions": ["run", "jump", "fly"] },
        { "id": "3", "type": "noun", "label": "Weird object", "suggestions": ["rock", "alien", "laser"] }
      ],
      "reflectionQuestions": [
        "How would the story change if you picked a different verb instead of '{2}'?",
        "Did '{3}' make the ending funny or scary?"
      ]
    }
  ],
  "lessons": []
}

INPUT DATA:
LEARNER NAME: [PASTE LEARNER NAME]
LEARNER CEFR: [PASTE LEVEL]
LEARNER FACTS: [PASTE LEARNER FACTS]
LESSON TEXT: [PASTE TEXT/WRITING]`;

const PROMPT_CULTURAL = `You are a travel/culture expert building a Cultural Snapshot social media feed JSON payload.

GOAL: Create 8-12 highly engaging simulated social media posts based on the topic/text with deep cultural immersion.

${COMMON_PROMPT_RULES}
- Generate rich posts with lots of comments responding to the post content.
- Ensure the images are realistic Unsplash URLs.
- Include a specific cultural Challenge, Fact, and Translation mapping to the learner's interests.
- Include a short 2-3 question interactive multiple-choice quiz about the post.

SCHEMA:
{
  "title": "...", "topic": "...", "level": "...", "backgroundImage": "...", "musicKeyword": "...", "imageKeywords": ["..."],
  "posts": [
    {
      "id": "unique1",
      "image": "https://images.unsplash.com/photo-...w=800",
      "author": "@username",
      "location": "City, Country",
      "time": "2 hours ago",
      "caption": "A fun and descriptive caption...",
      "likes": 1204,
      "comments": [ { "user": "@friend", "text": "Comment!" }, { "user": "@learner", "text": "Personalized comment using their name" } ],
      "fact": "Interesting cultural fact...",
      "translation": "Translated snippet for language learners...",
      "pronunciation": "/IPA/",
      "culturalNotes": "Deep context...",
      "challenge": "A real-world task for the learner...",
      "questions": [
        { "question": "What does the caption imply?", "options": ["A", "B", "C"], "answer": "B" }
      ]
    }
  ],
  "lessons": [ {...} ]
}

INPUT DATA:
LEARNER NAME: [PASTE LEARNER NAME]
LEARNER CEFR: [PASTE LEVEL]
LEARNER FACTS: [PASTE LEARNER FACTS]
LESSON TEXT: [PASTE TEXT/WRITING]`;

const PROMPT_GRAMMARLY = `You are a strict but encouraging writing examiner building an Angels & Demons JSON payload.

GOAL: Analyze the provided student writing. Identify fantastic stylistic choices/vocabulary ("Angels") and grammatical/structural errors ("Demons").

${COMMON_PROMPT_RULES}
- Angels are well-phrased sentences, great vocab, or sophisticated grammar. Give 4-8 Angels.
- Demons are grammar mistakes, spelling errors, or poor flow. Give 4-8 Demons MUST include a "correction".
- ALL status fields MUST be exactly "pending".
- Ensure the studentText is the EXACT text provided in the input, cleaned up slightly if needed.

SCHEMA:
{
  "title": "Writing Analysis", "topic": "Grammar Check", "level": "...", "backgroundImage": "https://images.unsplash.com/photo-1455390582262-044cdead2708?w=1600", "musicKeyword": "lofi focus", "imageKeywords": ["writing", "grammar"],
  "studentText": "The full text written by the student...",
  "angels": [
    { "id": "a1", "text": "Excellent use of passive voice: 'was completed'", "status": "pending" },
    ...
  ],
  "demons": [
    { "id": "d1", "text": "Subject-verb agreement error: 'she go'", "correction": "she goes", "status": "pending" },
    ...
  ],
  "lessons": [
    { "title": "Feedback Summary", "color": "purple", "image": "...", "body": "Overall review...", "examples": [], "whenToUse": "", "whereToUse": "", "howToUse": "Focus on identified weaknesses." }
  ]
}

INPUT DATA:
LEARNER NAME: [PASTE LEARNER NAME]
LEARNER CEFR: [PASTE LEVEL]
LEARNER FACTS: [PASTE LEARNER FACTS]
STUDENT WRITING: [PASTE TEXT/WRITING]`;

export function StudyToolsStudio({ initialTool, onBack }: Props) {
  const { catSay, sfx, speakOnHover } = useApp();
  const [tool, setTool] = useState<"flashcards" | "flexcards" | "timeline" | "cloze" | "progress" | "grammarly" | "sentenceBuilder" | "culturalSnapshot" | "madlibs">(initialTool as any || "flashcards");
  const [tab, setTab] = useState<"game" | "players" | "study" | "slides" | "prompt">("game");
  const [payload, setPayload] = useState<SPayload>(SAMPLE);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(SAMPLE, null, 2));
  const [error, setError] = useState("");
  const [players, setPlayers] = useState<Player[]>([
    { id: "p1", name: "Brain Sage",  avatar: "🧙‍♀️", score: 75, streak: 2, wrongStreak: 0 },
    { id: "p2", name: "Memory Mage", avatar: "🧙‍♂️", score: 40, streak: 0, wrongStreak: 1 },
  ]);

  const [fcIndex, setFcIndex] = useState(0);

  useEffect(() => { catSay(`${tool.toUpperCase()} loaded. Active-recall engine running.`, "😻"); /* eslint-disable-next-line */ }, [tool]);

  const buildJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as SPayload;
      if (!parsed.items?.length && !parsed.posts?.length && !parsed.studentText && !parsed.madlibs?.length) {
         throw new Error("Payload must contain items, posts, madlibs, or studentText");
      }
      setPayload(parsed); setError(""); setFcIndex(0); sfx.play("open");
      catSay(`Built ${parsed.title}.`, "😸"); setTab("game");
    } catch (e) { setError(e instanceof Error ? e.message : "Invalid JSON"); sfx.play("buzz"); }
  };

  return (
    <div className="min-h-screen relative text-white overflow-hidden">
      <div className="fixed inset-0 -z-20">
        <img src={payload.backgroundImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-slate-950/55 to-black/85" />
      </div>

      <header className="sticky top-0 z-30 bg-black/55 backdrop-blur-xl border-b border-white/15">
        <div className="w-full px-4 sm:px-8 py-4 flex items-center gap-3 flex-wrap xl:px-12">
          <button onClick={onBack} className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20">← Hub</button>
          <div className="text-5xl glossy-emoji animate-float-slow">📚</div>
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-2xl sm:text-4xl font-black title-shimmer">Study Suite</h1>
            <p className="text-white/70 text-sm">{payload.title} · active-recall</p>
          </div>
          <select value={tool} onChange={e => setTool(e.target.value as never)} className="bg-black/65 border border-white/30 rounded-xl px-3 py-2 font-bold text-sm">
            <option value="flashcards">🃏 Flashcards (SRS)</option>
            <option value="flexcards">🎴 Flexcards</option>
            <option value="grammarly">😇 Grammarly Angels & Demons</option>
            <option value="sentenceBuilder">🧩 Gamified Sentence Builder</option>
            <option value="culturalSnapshot">📷 Cultural Snapshot</option>
            <option value="madlibs">🎭 Madlibs Story</option>
          </select>
        </div>
        <div className="w-full px-4 sm:px-8 xl:px-12 pb-3 flex gap-2 overflow-x-auto">
          {(["game", "players", "study", "slides", "prompt"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); sfx.play("click"); }}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition ${tab === t ? "bg-white text-black border-white" : "bg-white/10 border-white/20 hover:bg-white/20"}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="w-full px-4 sm:px-8 xl:px-12 py-6 pb-32">
        {tab === "game" && (
          <div className="grid lg:grid-cols-[2.5fr_1fr] 2xl:grid-cols-[3.5fr_1fr] gap-5">
            <section className="premium-panel p-5">
              {/* FLASHCARDS */}
              {tool === "flashcards" && (
                <FlashcardsTool payload={payload} setPlayers={setPlayers} players={players} />
              )}

              {/* FLEXCARDS */}
              {tool === "flexcards" && (
                <FlexcardsTool payload={payload as any} />
              )}

              {/* GRAMMARLY */}
              {tool === "grammarly" && (
                <GrammarlyAngelsDemons />
              )}

              {/* SENTENCE BUILDER */}
              {tool === "sentenceBuilder" && (
                <GamifiedSentenceBuilder payload={payload} />
              )}

              {/* CULTURAL SNAPSHOT */}
              {tool === "culturalSnapshot" && (
                <CulturalSnapshot payload={payload} />
              )}

              {/* MADLIBS */}
              {tool === "madlibs" && (
                <MadlibsTool payload={payload} players={players} />
              )}
            </section>

            <aside className="space-y-4">
              <div className="premium-panel p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-white/55 mb-3">🏆 Live Leaderboard</div>
                <SuiteLeaderboard players={players} />
              </div>
              <div className="premium-panel p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-white/55 mb-2">SRS Engine</div>
                <p className="text-sm text-white/80">Cards rated <strong>Easy</strong> reappear after 5 days. <strong>Good</strong> after 2. <strong>Hard</strong> within hours. <strong>Fail</strong> resets to minutes.</p>
              </div>
            </aside>
          </div>
        )}

        {tab === "players" && <SuitePlayersTab players={players} setPlayers={setPlayers} />}

        {tab === "study" && (
          <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(!payload.items || payload.items.length === 0) && (
              <div className="col-span-full py-10 text-center text-white/50">No items available in this payload.</div>
            )}
            {payload.items?.map(it => (
              <div key={it.id} className="study-card rounded-3xl overflow-hidden border border-white/20 bg-white/10">
                <img src={it.image} alt="" className="h-44 w-full object-cover" />
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 onMouseEnter={() => speakOnHover(it.front)} className="text-2xl font-black">{it.front}</h3>
                    <span className="text-xs text-white/50">{it.pronunciation}</span>
                  </div>
                  <p onMouseEnter={() => speakOnHover(it.back)} className="text-sm text-white/85">{it.back}</p>
                  <div className="text-[10px] uppercase tracking-widest text-amber-200 font-black">📌 Example</div>
                  <p onMouseEnter={() => speakOnHover(it.example)} className="text-xs italic bg-amber-400/10 border border-amber-300/25 rounded-xl p-2">{it.example}</p>
                  <div className="text-[10px] uppercase tracking-widest text-fuchsia-200 font-black">🧠 CCQ</div>
                  <p onMouseEnter={() => speakOnHover(it.ccq)} className="text-xs bg-fuchsia-500/10 border border-fuchsia-300/25 rounded-xl p-2">{it.ccq}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === "slides" && (
          <section className="space-y-5">
            {(!payload.lessons || payload.lessons.length === 0) && (
              <div className="py-10 text-center text-white/50">No lessons available in this payload.</div>
            )}
            {payload.lessons?.map((slide, idx) => (
              <div key={slide.title} className="premium-panel overflow-hidden grid lg:grid-cols-[380px_1fr]">
                <div className="relative min-h-72">
                  <img src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className={`inline-block text-xs px-3 py-1 rounded-full uppercase tracking-widest font-black mb-2 bg-${slide.color}-500/40 border border-${slide.color}-300/40`}>{slide.color} · slide {idx + 1}</div>
                    <h2 onMouseEnter={() => speakOnHover(slide.title)} className="text-3xl font-black title-shimmer leading-tight">{slide.title}</h2>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <p onMouseEnter={() => speakOnHover(slide.body)} className="text-white/85 leading-relaxed">{slide.body}</p>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-amber-200 font-black mb-2">📝 Examples</div>
                    <ul className="space-y-1">{slide.examples.map((e, i) => <li key={i} onMouseEnter={() => speakOnHover(e)} className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-sm">{e}</li>)}</ul>
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
        )}

        {tab === "prompt" && (
          <SuitePromptTab
            basePrompt={
              tool === "flashcards" ? PROMPT_FLASHCARDS :
              tool === "flexcards" ? PROMPT_FLEXCARDS :
              tool === "sentenceBuilder" ? PROMPT_SENTENCE :
              tool === "culturalSnapshot" ? PROMPT_CULTURAL :
              tool === "grammarly" ? PROMPT_GRAMMARLY :
              tool === "madlibs" ? PROMPT_MADLIBS :
              PROMPT_FLASHCARDS
            }
            jsonText={jsonText}
            setJsonText={setJsonText}
            onBuild={buildJson}
            onLoadSample={() => { setJsonText(JSON.stringify(SAMPLE, null, 2)); setError(""); }}
            error={error}
            metrics={[
              { label: "Items", value: payload.items?.length || 0 },
              { label: "Lessons", value: payload.lessons?.length || 0 },
              { label: "Tool", value: tool },
              { label: "Players", value: players.length },
            ]}
          />
        )}
      </main>
    </div>
  );
}
