import { useCallback, useMemo, useState } from "react";
import {
  PlayerSetup,
  SplashScreen,
  type ShellPlayer,
  type ShellSetupConfig,
  type ShellSetupResult,
  type ShellSplashConfig,
} from "./GameShell";
import { buildMadlibsPrompt, parseMadlibsPack, validateMadlibsJson } from "./gamePack";
import { MadlibsTool } from "./games/madlibs/madlibs";
import { clearSession, loadSession } from "./games/madlibs/storage";
import type { Payload, Player } from "./games/madlibs/types";

/* ═══════════════════════════════════════════════════════════════════════════
   MADLIBS — app entry
   ───────────────────────────────────────────────────────────────────────────
   The SAME first two screens every Tutorly game shows:
     splash  →  player setup (names, facts, avatars, CEFR, AI pack)  →  the game.
   Only the wording and the prompt below are specific to MadLibs.
   ═══════════════════════════════════════════════════════════════════════════ */

const AVATARS = [
  "🦊", "🐼", "🐯", "🐸", "🦄", "🐙", "🦁", "🐨", "🐵", "🐧", "🦉", "🐢",
  "🐝", "🦋", "🐳", "🦖", "🐲", "🦕", "🐬", "🦜", "🐺", "🦔", "🐿️", "🦩",
];

const COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

const TOPICS = [
  "General English",
  "Past Simple vs Past Continuous",
  "Present Perfect",
  "Reported Speech",
  "Conditionals",
  "Passive Voice",
  "Phrasal Verbs",
  "Business English",
  "Travel English",
  "Exam practice (Cambridge)",
];

export default function App() {
  const [page, setPage] = useState<"splash" | "setup" | "game">("splash");
  const [darkMode, setDarkMode] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [payload, setPayload] = useState<Payload | undefined>(undefined);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [level, setLevel] = useState("B1");
  const [location, setLocation] = useState("");
  /** bumps whenever the game should pick up the stored session again */
  const [resumeToken, setResumeToken] = useState(0);
  const [packNote, setPackNote] = useState<string | null>(null);

  const saved = useMemo(() => loadSession(), [page, resumeToken]);
  const canResume = page === "splash" && !!saved;

  const handleShellStart = useCallback((data: ShellSetupResult) => {
    const converted: Player[] = data.players.map((p: ShellPlayer, i: number) => ({
      id: `p${i + 1}`,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
    }));

    let nextPayload: Payload | undefined;
    if (data.json) {
      const parsed = parseMadlibsPack(data.json);
      if (parsed.ok) {
        nextPayload = parsed.pack.payload;
        setPackNote(
          `${parsed.pack.payload.madlibs.length} AI stories loaded` +
            (parsed.pack.warnings.length ? ` · ${parsed.pack.warnings.length} fix-ups` : ""),
        );
      } else {
        setPackNote(`AI pack rejected: ${parsed.error} — playing the built-in library.`);
      }
    } else {
      setPackNote(null);
    }

    setPlayers(converted);
    setPayload(nextPayload);
    setTopic(data.topic);
    setLevel(data.level);
    setLocation(data.location);
    setPage("game");
  }, []);

  const shellSplash = useMemo<ShellSplashConfig>(
    () => ({
      gameTitle: "MadLibs",
      gameEmoji: "🎭",
      tagline: "The class writes one ridiculous story together — one word, one turn at a time.",
      accent: "#a855f7",
      features: [
        { icon: "🎲", label: "Turn-based blanks" },
        { icon: "🧑‍🏫", label: "Grammar coach" },
        { icon: "🔀", label: "Branching story" },
        { icon: "📚", label: "Word bank + review" },
        { icon: "🤖", label: "AI story packs" },
        { icon: "🔊", label: "Reads the story aloud" },
      ],
      howToPlay: [
        "Set up the class: a name, avatar and a few facts for each learner — the AI writes the stories around them.",
        "Optional: choose the lesson focus and a theme for the session.",
        "Press “Copy AI Prompt”, paste it into ChatGPT or Claude, then paste the JSON it writes back and press Load Pack.",
        "Each blank belongs to a player: fill yours before the timer runs out, or someone else can steal it.",
        "The coach grades the FORM (is it really an adverb?) — wow the class and the next story gets harder.",
        "After the story, choose what happens next, then finish with the normal or absurd ending.",
        "Words you used land in the word bank for a spaced-repetition review before the next lesson.",
      ],
    }),
    [],
  );

  const shellSetup = useMemo<ShellSetupConfig>(
    () => ({
      gameTitle: "MadLibs",
      gameEmoji: "🎭",
      accent: "#a855f7",
      playersHeading: "The class",
      playersHelp: "Names, avatars and interests — the AI writes every learner into the story.",
      locationLabel: "🎬 STORY SETTING (optional)",
      locationPlaceholder: "e.g. a space station, our school, a rainy Tuesday in Rome",
      locationHelp: "Optional: the setting the stories should happen in.",
      settingsHeading: "Lesson focus & level",
      topics: TOPICS,
      levels: ["A1", "A2", "B1", "B2", "C1", "C2"],
      playerColors: COLORS,
      avatars: AVATARS,
      maxPlayers: 6,
      buildPrompt: (ctx) => buildMadlibsPrompt(ctx),
      validateJson: validateMadlibsJson,
      jsonPlaceholder: 'Paste the JSON your AI returned here — it starts with { "learnerInfo": … }',
      onStart: handleShellStart,
      onBack: () => setPage("splash"),
    }),
    [handleShellStart],
  );

  if (page === "splash") {
    return (
      <SplashScreen
        config={shellSplash}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onPlay={() => setPage("setup")}
        hasSavedGame={canResume}
        onContinue={() => {
          const session = loadSession();
          if (session?.players?.length) setPlayers(session.players);
          setResumeToken((t) => t + 1);
          setPage("game");
        }}
      />
    );
  }

  if (page === "setup") {
    return (
      <PlayerSetup config={shellSetup} darkMode={darkMode} onToggleDark={() => setDarkMode((d) => !d)} />
    );
  }

  return (
    <MadlibsTool
      key={resumeToken}
      payload={payload}
      players={players.length ? players : saved?.players ?? []}
      topic={topic || saved?.topic || TOPICS[0]}
      level={level || saved?.level || "B1"}
      location={location || saved?.location || ""}
      packNote={packNote}
      darkMode={darkMode}
      onDarkModeChange={setDarkMode}
      onExit={() => {
        clearSession();
        setPage("setup");
      }}
      onHome={() => setPage("splash")}
    />
  );
}
