import { useMemo, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { CatCompanion } from "./components/CatCompanion";
import { CategorySection } from "./components/CategorySection";
import { ActivityModal } from "./components/ActivityModal";
import { PremiumBaamboozleStudio } from "./components/PremiumBaamboozleStudio";
import { WordwallSuiteStudio } from "./components/WordwallSuiteStudio";
import { StudyToolsStudio } from "./components/StudyToolsStudio";
import { PremiumGimkitStudio } from "./components/PremiumGimkitStudio";
import { HumansVsZombiesMode } from "./components/gimkit/HumansVsZombiesMode";
import { GamesQuizzesStudio } from "./components/GamesQuizzesStudio";
import { WordActivitiesStudio } from "./components/WordActivitiesStudio";
import { TeamCompetitionStudio } from "./components/TeamCompetitionStudio";
import { CreativeStudio } from "./components/CreativeStudio";
import { ACTIVITY_COUNT, ADULT_ACTIVITY_COUNT, CATEGORIES, KIDS_ACTIVITY_COUNT, KIDS_CATEGORY, type Activity } from "./data/activities";
import { KidsSection } from "./components/KidsSection";
import type { BaamGameModeId } from "./data/baamboozleModes";
import type { WordwallModeId } from "./data/wordwallModes";

// Map each Baamboozle Suite activity card → exact studio game mode.
const BAAM_ACTIVITY_TO_MODE: Record<string, BaamGameModeId> = {
  "bb-baamboozle":   "baamboozle",
  "bb-plink-oh":     "plink-oh",
  "bb-spud":         "spud-game",
  "bb-bowling":      "bowling",
  "bb-snakes":       "snakes-and-ladders",
  "bb-egghunt":      "egg-hunt",
  "bb-guesseroo":    "guess-eroo",
  "bb-boxes":        "boxes",
  "bb-bball":        "b-ball",
  "bb-world-pup":    "world-pup-soccer",
  "bb-football":     "american-football",
  "bb-tictactoe":    "tic-tac-toe",
  "bb-popman":       "popman",
  "bb-doublevision": "double-vision",
  "bb-storydice":    "story-dice",
  "bb-fourrow":      "four-in-a-row",
  "bb-memory":       "memory",
  "bb-bingo":        "bingo",
};

const WORDWALL_ACTIVITY_TO_MODE: Record<string, WordwallModeId> = {
  "ww-match": "match-up",
  "ww-find-match": "find-the-match",
  "ww-group-sort": "group-sort",
  "ww-quiz": "quiz",
  "ww-gameshow-quiz": "quiz",
  "ww-maze-chase": "maze-chase",
  "ww-open-the-box": "open-the-box",
  "ww-wordsearch": "wordsearch",
  "ww-anagram": "anagram",
  "ww-missing-word": "missing-word",
  "ww-random-wheel": "random-wheel",
  "ww-spin-wheel": "random-wheel",
  "ww-unjumble": "unscramble",
  "ww-labelled": "labelled-diagram",
  "ww-whack-a-mole": "whack-a-mole",
  "ww-flying-fruit": "whack-a-mole",
  "ww-balloon-pop": "whack-a-mole",
  "ww-airplane": "airplane",
  "ww-flash-cards": "flashcards",
  "ww-flip-tiles": "flip-tiles",
  "ww-matching-pairs": "flip-tiles",
  "ww-image-quiz": "flip-tiles",
  "ww-rank-order": "rank-order",
  "ww-true-false": "true-or-false",
  "ww-type-answer": "missing-word",
  "ww-crossword": "wordsearch",
  "ww-hangman": "anagram",
  "ww-win-or-lose": "quiz",
  "ww-word-magnets": "unscramble",
  "ww-watch-memorize": "flip-tiles",
  "ww-speaking-cards": "random-wheel",
};

const STUDY_ACTIVITY_TO_TOOL = {
  "flashcards": "flashcards",
  "flexcards": "flexcards",
  "timeline": "timeline",
  "cloze": "cloze",
  "progress": "progress",
  "grammarly": "grammarly",
  "sentenceBuilder": "sentenceBuilder",
  "culturalSnapshot": "culturalSnapshot",
  "madlibs": "madlibs",
} as const;

function HubInner() {
  const { speakOnHover, catSay, sfx } = useApp();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Activity | null>(null);
  const [filterId, setFilterId] = useState<string>("all");
  const [studioMode, setStudioMode] = useState<BaamGameModeId | null>(null);
  const [wordwallMode, setWordwallMode] = useState<WordwallModeId | null>(null);
  const [studyTool, setStudyTool] = useState<string | null>(null);
  const [gimkitOpen, setGimkitOpen] = useState(false);
  const [hvzOpen, setHvzOpen] = useState(false);
  const [gamesQuizzesTool, setGamesQuizzesTool] = useState<string | null>(null);
  const [wordActivitiesTool, setWordActivitiesTool] = useState<string | null>(null);
  const [teamTool, setTeamTool] = useState<string | null>(null);
  const [creativeTool, setCreativeTool] = useState<string | null>(null);

  // The Kids' Corner is its own section: "All" shows grown-up categories then the
  // kids' one, and picking the Kids chip shows only the kids' section.
  const kidsOnly = filterId === KIDS_CATEGORY.id;
  const visibleCategories = useMemo(
    () => (filterId === "all" || kidsOnly ? CATEGORIES : CATEGORIES.filter(c => c.id === filterId)),
    [filterId, kidsOnly]
  );
  const showKids = filterId === "all" || kidsOnly;
  const showHero = (filterId === "all" || kidsOnly) && !search;

  const handleLaunch = (a: Activity) => {
    // A tile with a launchPath is its own build, uploaded to the host as
    // /tutorly-games/<folder>/index.html — the URL lives in the data (activities.ts),
    // so a tile can never point at a folder that no longer exists. Lingo's
    // launchPath also carries ?continue=1 to resume the next unfinished lesson.
    const launchUrl = a.launchPath;
    if (launchUrl) {
      sfx.play("open");
      catSay(`Loading ${a.name}. Redirecting to the games folder...`, a.ai.emotion);
      setTimeout(() => {
        window.location.href = launchUrl;
      }, 500);
      return;
    }

    const modeId = BAAM_ACTIVITY_TO_MODE[a.id];
    if (modeId) {
      sfx.play("open");
      setStudioMode(modeId);
      catSay(`Loading ${a.name}. Press Maximize for screen sharing!`, a.ai.emotion);
      return;
    }
    const wwModeId = WORDWALL_ACTIVITY_TO_MODE[a.id];
    if (wwModeId) {
      sfx.play("open");
      setWordwallMode(wwModeId);
      catSay(`Loading ${a.name} in Wordwall Suite. Press Maximize for screen sharing!`, a.ai.emotion);
      return;
    }
    const stId = STUDY_ACTIVITY_TO_TOOL[a.id as never];
    if (stId) {
      sfx.play("open");
      setStudyTool(stId);
      catSay(`Loading ${a.name} Study Tool. Active Recall consolidation factors running.`, a.ai.emotion);
      return;
    }
    if (a.id === "gimkit") {
      sfx.play("open");
      setGimkitOpen(true);
      catSay(`Loading Gimkit Suite. Active upgrade progression AUTHORized loops running!`, a.ai.emotion);
      return;
    }
    if (a.id === "gk-hvz") {
      sfx.play("open");
      setHvzOpen(true);
      catSay(`Loading Humans vs Zombies mode!`, a.ai.emotion);
      return;
    }

    // Now check which category it belongs to and open the respective Suite instead of the generic modal
    const cat = CATEGORIES.find(c => c.activities.some(act => act.id === a.id));
    if (cat) {
      sfx.play("open");
      if (cat.id === "games") { setGamesQuizzesTool(a.id); return; }
      if (cat.id === "words") { setWordActivitiesTool(a.id); return; }
      if (cat.id === "team") { setTeamTool(a.id); return; }
      if (cat.id === "creative") { setCreativeTool(a.id); return; }
    }

    setActive(a);
  };

  if (studioMode) {
    return (
      <>
        <PremiumBaamboozleStudio
          onBack={() => setStudioMode(null)}
          initialModeId={studioMode}
        />
        <CatCompanion />
      </>
    );
  }

  if (wordwallMode) {
    return (
      <>
        <WordwallSuiteStudio
          onBack={() => setWordwallMode(null)}
          initialModeId={wordwallMode}
        />
        <CatCompanion />
      </>
    );
  }

  if (studyTool) {
    return (
      <>
        <StudyToolsStudio
          initialTool={studyTool as any}
          onBack={() => setStudyTool(null)}
        />
        <CatCompanion />
      </>
    );
  }

  if (gimkitOpen) {
    return (
      <>
        <PremiumGimkitStudio
          onBack={() => setGimkitOpen(false)}
        />
        <CatCompanion />
      </>
    );
  }

  if (hvzOpen) {
    return (
      <>
        <HumansVsZombiesMode onBack={() => setHvzOpen(false)} />
        <CatCompanion />
      </>
    );
  }

  if (gamesQuizzesTool) {
    return <GamesQuizzesStudio initialGame={gamesQuizzesTool} onBack={() => setGamesQuizzesTool(null)} />;
  }
  if (wordActivitiesTool) {
    return <WordActivitiesStudio initialGame={wordActivitiesTool} onBack={() => setWordActivitiesTool(null)} />;
  }
  if (teamTool) {
    return <TeamCompetitionStudio initialGame={teamTool} onBack={() => setTeamTool(null)} />;
  }
  if (creativeTool) {
    return <CreativeStudio initialGame={creativeTool} onBack={() => setCreativeTool(null)} />;
  }

  return (
    <div className="min-h-screen w-full">
      <div className="cosmic-bg" />

      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <a 
              href="/"
              className="text-white/60 hover:text-white flex items-center justify-center p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors mr-2"
              title="Back to Classroom"
            >
              &larr; Back
            </a>
            <div className="text-4xl"
              style={{ filter: "drop-shadow(0 4px 6px rgba(168,85,247,0.6))" }}
            >🎓</div>
            <div>
              <h1
                onMouseEnter={() => speakOnHover("Activity Library Hub")}
                className="text-xl sm:text-2xl font-extrabold title-shimmer leading-none"
              >
                Activity Library Hub
              </h1>
              <p className="text-xs text-white/60">              {ADULT_ACTIVITY_COUNT} activities · {CATEGORIES.length} categories + Kids' Corner</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search activities…"
              className="px-3 py-2 text-sm rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 w-48 sm:w-64"
            />
            <button
              onClick={() => {
                catSay(`Welcome! I'm Whisker, your learning cat companion. We have ${ACTIVITY_COUNT} interactive activities across ${CATEGORIES.length} categories plus the Kids' Corner with ${KIDS_ACTIVITY_COUNT || "new"} little games. Hover any item and I'll read it. Click to launch.`, "😻");
                sfx.play("open");
              }}
              className="px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg hover:scale-105 active:scale-95 transition"
            >
              🐱 Tour
            </button>
          </div>
        </div>

        {/* Category chips */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto">
          <Chip active={filterId === "all"} onClick={() => { setFilterId("all"); sfx.play("click"); }}
            label="✨ All" />
          {CATEGORIES.map(c => (
            <Chip
              key={c.id}
              active={filterId === c.id}
              onClick={() => { setFilterId(c.id); sfx.play("click"); }}
              onMouseEnter={() => speakOnHover(c.name)}
              label={`${c.icon} ${c.name}`}
              color={c.color}
            />
          ))}
          <Chip
            active={kidsOnly}
            onClick={() => { setFilterId(KIDS_CATEGORY.id); sfx.play("click"); }}
            onMouseEnter={() => speakOnHover("Kids' Corner")}
            label={`${KIDS_CATEGORY.icon} ${KIDS_CATEGORY.name}`}
            color="from-sky-400 to-pink-400"
          />
        </div>
      </header>

      {/* Hero */}
      {showHero && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6 text-center">
          <div className="inline-block text-[100px] sm:text-[140px] leading-none mb-2"
            style={{ filter: "drop-shadow(0 12px 20px rgba(168,85,247,0.6))" }}>
            🎮
          </div>
          <h2 className="text-3xl sm:text-5xl font-black title-shimmer leading-tight mb-3">
            Transform Learning Into Play
          </h2>
          <p
            onMouseEnter={() => speakOnHover("A modular AI-powered system that turns static content into dynamic interactive experiences.")}
            className="text-white/75 max-w-2xl mx-auto text-sm sm:text-base"
          >
            A modular AI-powered system that turns static content into dynamic interactive experiences.
            Pick a category — Whisker the cat will guide you through every activity.
          </p>
        </section>
      )}

      {/* Categories */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-32">
        {!kidsOnly && visibleCategories.map(c => (
          <CategorySection
            key={c.id}
            category={c}
            onLaunch={handleLaunch}
            searchQuery={search}
          />
        ))}

        {/* Kids' Corner — its own section with its own look. */}
        {showKids && (
          <KidsSection category={KIDS_CATEGORY} onLaunch={handleLaunch} searchQuery={search} />
        )}

        {search && [...visibleCategories, ...(showKids ? [KIDS_CATEGORY] : [])].every(c =>
          !c.activities.some(a =>
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.description.toLowerCase().includes(search.toLowerCase()) ||
            a.similarTo.toLowerCase().includes(search.toLowerCase())
          )
        ) && (
          <div className="text-center py-20 text-white/60">
            <div className="text-7xl mb-4">🙀</div>
            <p>No activities match "{search}"</p>
          </div>
        )}
      </main>

      <footer className="text-center text-white/40 text-xs py-6">
        Built with 🐾 — Activity Library Hub © 2026
      </footer>

      <ActivityModal activity={active} onClose={() => setActive(null)} />
      <CatCompanion />
    </div>
  );
}

function Chip({ active, onClick, onMouseEnter, label, color }: {
  active: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`shrink-0 px-3 py-1.5 text-sm rounded-full border transition whitespace-nowrap font-semibold ${
        active
          ? `bg-gradient-to-r ${color ?? "from-purple-500 to-pink-500"} border-white/40 text-white shadow-lg scale-105`
          : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
      }`}
    >
      {label}
    </button>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HubInner />
    </AppProvider>
  );
}
