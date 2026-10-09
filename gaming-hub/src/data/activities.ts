// Activity Library Data — AI-generated JSON payloads that build interactive modules
// Each activity carries pedagogical metadata, environmental settings (timers, hints),
// and AI feedback strings consumed by the Talking Cat companion.

export type Emotion =
  | "😺" | "😸" | "😹" | "😻" | "😼" | "😽" | "🙀" | "😿" | "😾" | "🐱"
  /**
   * The Kids' Corner tiles don't use the cat: each game is a character (the panda
   * dictionary, the fox playground, the teddy toy box, the hero, the speech bubble),
   * and Whisker keeps whichever face the tile asked for.
   */
  | "🐼" | "🦊" | "🧸" | "🦸" | "💬"
  /** The games console tile, and the quiz arena's cash register. */
  | "🎮"
  | "💸";

export interface AIFeedback {
  intro: string;       // Cat introduces the activity
  tip: string;         // Pedagogical tip
  correct: string;     // When learner is right
  incorrect: string;   // Gentle correction
  encourage: string;   // Mid-activity nudge
  emotion: Emotion;    // Cat mood for this activity
}

export interface Activity {
  id: string;
  name: string;
  emoji: string;       // Glossy 3D emoji
  description: string;
  similarTo: string;
  /**
   * Where the tile sends the learner when the activity is its own app instead of a
   * studio inside the hub. `undefined` = built in the hub. Build it with `launch()`.
   */
  launchPath?: string;
  // Environmental settings auto-built by the AI process
  settings: {
    timerSec?: number;
    hints?: boolean;
    difficulty?: "easy" | "medium" | "hard";
    multiplayer?: boolean;
    maxPlayers?: number;
    sfx?: string;     // sfx key
  };
  ai: AIFeedback;
}

export interface Category {
  id: string;
  name: string;
  tagline: string;
  color: string;       // tailwind gradient classes
  glow: string;        // box-shadow color
  bgImage: string;     // Unsplash url
  icon: string;        // glossy emoji
  activities: Activity[];
}

// Curated stock photo URLs (Unsplash, Pexels) — direct CDN, no API key needed.
const BG = {
  kids:     "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1600&q=80&auto=format&fit=crop",
  study:    "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1600&q=80&auto=format&fit=crop",
  games:    "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1600&q=80&auto=format&fit=crop",
  words:    "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1600&q=80&auto=format&fit=crop",
  team:     "https://images.unsplash.com/photo-1529390079861-591de354faf5?w=1600&q=80&auto=format&fit=crop",
  creative: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1600&q=80&auto=format&fit=crop",
  bamboozle:"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80&auto=format&fit=crop",
  wordwall: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600&q=80&auto=format&fit=crop",
};

const mk = (
  id: string, name: string, emoji: string,
  description: string, similarTo: string,
  settings: Activity["settings"], ai: AIFeedback, launch?: string,
): Activity => ({ id, name, emoji, description, similarTo, launchPath: launch, settings, ai });

function fb(intro: string, emotion: Emotion): AIFeedback {
  return {
    intro,
    tip: "Read carefully and breathe — you've got this.",
    correct: "Purrfect — well done!",
    incorrect: "Not quite — try once more.",
    encourage: "Keep going, you're improving!",
    emotion,
  };
}

/**
 * The URL of a standalone sub-app.
 *
 * Every game that is not built inside the hub (Lingo, Runner, the arcade and
 * board games, GeoSeeker, Chess…) is its own build, uploaded to the host inside
 * one of the two audience folders:
 *
 *   <web root>/tutorly-games/adult/<folder>/index.html   ← grown-up games
 *   <web root>/tutorly-games/kids/<folder>/index.html    ← kids' games
 *
 * `folder` is the folder name on the host, EXACTLY as it is spelled there (case
 * included) — it is the only thing that decides whether the tile loads or 404s,
 * so it is spelled out per activity instead of being derived from the id.
 * `index.html` is kept explicit: it works whether or not the host has directory
 * indexes turned on.
 */
export const GAME_ROOT = { adult: "/tutorly-games/adult", kids: "/tutorly-games/kids" } as const;


export type Audience = keyof typeof GAME_ROOT;

const launchIn = (audience: Audience, folder: string, query = ""): string =>
  `${GAME_ROOT[audience]}/${folder}/index.html${query}`;

/** A grown-up game, served from `/tutorly-games/adult/<folder>/`. */
const launch = (folder: string, query = ""): string => launchIn("adult", folder, query);

/**
 * A kids' game, served from `/tutorly-games/kids/<folder>/`.
 *
 * To add one: copy the built game into `tutorly-games/kids/<folder>/`, then add an
 * activity below with `launchKids("<folder>")`. Nothing else needs to change — the
 * Kids' Corner renders whatever is in `KIDS_CATEGORY.activities`.
 */
export const launchKids = (folder: string, query = ""): string => launchIn("kids", folder, query);

/**
 * THE ADULT NAMING CONVENTION — the same rule the kids' games follow.
 *
 *   1. The FOLDER is a single lower-case word, no hyphens and no digits (`lingo`,
 *      `edupoly`, `hotseat`); it IS the URL, so it is the one thing that is hard
 *      to change later, and `launch("<folder>")` must spell it exactly.
 *   2. The in-app name is that word in CamelCase — `Lingo`, `EduPoly`, `HotSeat`.
 *   3. Name the game after what the learner DOES, not what it teaches, and keep it
 *      sayable out loud (`runner`, not `SideScrollVocabShooter3D`).
 *   4. No two games may share a word, and no trademarked title survives: the 3D
 *      Monopoly build is EduPoly, the game show is HotSeat.
 *   5. Renaming a folder means adding the OLD folder to `ADULT_LEGACY` in
 *      `scripts/collect-standalone-apps.mjs`, which deletes the stale dist copy and
 *      leaves a forwarding page behind so old links keep working.
 *
 * The *server* app is the exception to the dist/ rule: Reel (the video platform,
 * Next.js + PostgreSQL) needs its own Node process, so it is hosted separately and
 * pointed at with an env var — the default is the same-origin path, which works
 * when a reverse proxy serves it there. The other two left that group: Interview's
 * workspace runs in the browser, and Console's proxy moved into a `play.php` inside
 * its own folder, so both are static folders like the rest.
 */
const envVars = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

/** The video platform, Reel. `VITE_REEL_URL` (or the legacy `VITE_TUTOFLIX_V2_URL`). */
export const VIDEO_PLATFORM_URL: string = (envVars?.VITE_REEL_URL ?? envVars?.VITE_TUTOFLIX_V2_URL)
  ? (envVars?.VITE_REEL_URL ?? envVars?.VITE_TUTOFLIX_V2_URL)!.replace(/\/?$/, "/")
  : launchIn("adult", "reel");

/**
 * The games console, Console. `VITE_CONSOLE_URL`, else the same-origin folder.
 *
 * It is a plain folder again — a static export, like the kids' games. The one
 * piece that cannot run in a browser (stripping the CSP off a YouTube Playables
 * build so it can be framed) ships inside that folder as `play.php`, which their
 * cPanel host runs; where PHP is unavailable the app sends you to the game on
 * YouTube instead of showing a dead frame. Only set the env var if you host it
 * somewhere else.
 */
export const CONSOLE_URL: string = envVars?.VITE_CONSOLE_URL
  ? envVars.VITE_CONSOLE_URL.replace(/\/?$/, "/")
  : launchIn("adult", "console");

/**
 * The quiz arena, Cash Arena. `VITE_CASHARENA_URL`, else the same-origin folder.
 *
 * A static export like Console, so it needs no host of its own: open the tile and
 * the game is there. The one thing it cannot do from a folder is hold a database,
 * so the quiz library and the score history live in the tutor's browser and the
 * live game travels phone-to-laptop over WebRTC — see its `src/lib/localApi.ts`.
 */
export const CASHARENA_URL: string = envVars?.VITE_CASHARENA_URL
  ? envVars.VITE_CASHARENA_URL.replace(/\/?$/, "/")
  : launchIn("adult", "casharena");

export const CATEGORIES: Category[] = [
  {
    id: "action_survival",
    name: "Action & Survival",
    tagline: "High Stakes & Adventure",
    color: "from-rose-500 via-red-600 to-red-800",
    glow: "rgba(225,29,72,0.55)",
    bgImage: BG.games,
    icon: "⚔️",
    activities: [
      mk("dungeon","Dungeon","🐉","Answer correctly to slay monsters, fail and face their wrath!","D&D", { timerSec: 60, multiplayer: false }, { intro:"Welcome to the dungeon! Fight or perish.", tip:"Focus on getting it right, not just fast.", correct:"You hit the monster!", incorrect:"The monster hits you!", encourage:"Keep fighting!", emotion:"🙀" }, launch("dungeon")),
      mk("ladder","Ladder","🐍","3D immersive board game of Snakes and Ladders with survival stakes!","Chutes and Ladders", { timerSec: 60, multiplayer: true }, { intro:"Roll the dice to climb ladders, but beware the snakes!", tip:"Every move is a gamble.", correct:"You rolled high!", incorrect:"You landed on a snake!", encourage:"The finish line is close!", emotion:"😼" }, launch("ladder")),
      mk("geoseeker","GeoSeeker","🌍","Immersive interactive world map seeking game to test borders, terrains, and locations!","Geoguessr", { timerSec: 120, multiplayer: false }, { intro:"Ready for a grand geographic search adventure? Locate items on the global coordinate maps!", tip:"Examine physical continents and borders closely.", correct:"Target spotted precisely! Tremendous tracking scores added.", incorrect:"Geographic deviation! Re-align coordinates.", encourage:"The world holds many secrets, keep exploration active!", emotion:"😻" }, launch("geoseeker")),
      mk("tales","Tales","📖","Create immersive, interactive stories with branching choices and survival elements!","Choose Your Own Adventure", { timerSec: 60, multiplayer: false }, { intro:"Ready to weave a tale? Choose your path to survive!", tip:"There are no wrong answers in storytelling, only dangerous ones.", correct:"A thrilling turn of events!", incorrect:"You encountered a trap, try another path.", encourage:"The story needs you to survive!", emotion:"😸" }, launch("tales")),
      mk("ww-open-the-box","Open the Box","🎁","Tap boxes to reveal a question or reward.","Wordwall Box", { sfx:"unwrap" }, fb("Tap a box — surprise inside!","😻")),
      mk("runner","Runner","🏃","Side-scrolling horde survival shooter — answer vocabulary questions to unlock weapons, shields and allies while you run the bridge.","Mob Control / Last War", { timerSec: 0, hints: true, difficulty:"medium", multiplayer: false }, { intro:"Runner online — answer to survive the horde!", tip:"Move with A/D or drag. Correct answers unlock firepower.", correct:"Correct! Cache cracked — new gear unlocked.", incorrect:"Wrong line — the horde closes in.", encourage:"Survive 40 seconds to advance the wave.", emotion:"🙀" }, launch("runner"))
    ]
  },
  {
    id: "sports_arcade",
    name: "Sports & Arcade",
    tagline: "Action-Packed Competitions",
    color: "from-emerald-400 via-teal-500 to-cyan-600",
    glow: "rgba(20,184,166,0.55)",
    bgImage: BG.team,
    icon: "🏀",
    activities: [
      mk("console","Console","🎮","The games console: 1,649 indexed YouTube Playables plus 4,426 CrazyGames games and the Unity WebGL builds you drop in, played inside a pro-gaming rig — Cinema Ultra Rig, Retro Arcade Cabinet, Tutorly Handheld or Clean Pro, ambient RGB, CRT scanlines — with automatic score capture through a built-in ytgame shim and a leaderboard that keeps your own best runs.","YouTube Playables + CrazyGames + Unity WebGL", { timerSec: 0, hints: false, difficulty:"medium", multiplayer: true }, { intro:"Console is booting — pick a playable or open your own Unity build!", tip:"Switch the rig from the panel on the right; the game keeps running.", correct:"Saved! The scoreboard just moved.", incorrect:"That shot missed — try another playable.", encourage:"Scores keep climbing: keep playing.", emotion:"🎮" }, CONSOLE_URL),
      mk("casharena","Cash Arena","💸","The live multiplayer quiz arena: every correct answer pays cash, the shop multiplies it, power-up cards drop mid-game and the leaderboard never sits still. The tutor hosts on the big screen and the class joins from their phones with a six-letter code — no accounts, no install — then a score sheet and teaching report turn every miss into next lesson's plan.","Gimkit + Kahoot + Quizizz", { timerSec: 0, hints: true, difficulty:"medium", multiplayer: true, maxPlayers: 40 }, { intro:"The arena is open — answer for cash, buy upgrades and spoil your rivals' plans!", tip:"Correct answers pay the bills, but the shop is where a careful player wins: multipliers first, insurance second.", correct:"Cha-ching! That answer paid out — spend it before someone steals it.", incorrect:"That one cost you — read the mini lesson, the rule is in there.", encourage:"The board only has a few cells left: keep the streak alive.", emotion:"😻" }, CASHARENA_URL),
      mk("gk-hvz","Humans vs Zombies","🧟","Survive the zombies or break the barrier!","Gimkit HvZ", { multiplayer:true, sfx:"cash" }, { intro:"Fight for survival or infect them all!", tip:"Upgrade early.", correct:"Nice hit!", incorrect:"Ouch!", encourage:"Keep fighting!", emotion:"🙀" }),
      mk("gimkit","Gimkit","💰","Earn virtual currency for answering questions to buy power-ups.","Gimkit", { multiplayer:true, sfx:"cash" }, { intro:"Cash in correct answers, then upgrade your earnings!", tip:"Reinvest early — compounding wins.", correct:"+$500 to your account!", incorrect:"You lost a bit.", encourage:"Buy a multiplier!", emotion:"😻" })
    ]
  },
  {
    id: "roleplay_trivia",
    name: "Roleplay & Trivia",
    tagline: "Brainy & Immersive",
    color: "from-purple-500 via-indigo-500 to-blue-500",
    glow: "rgba(139,92,246,0.55)",
    bgImage: BG.creative,
    icon: "🎭",
    activities: [
      mk("werewolf","Werewolf","🐺","Social deduction game: find the wolves before they find you.","Werewolf / Mafia", { multiplayer: true }, { intro:"The village is asleep. Werewolves, make your move.", tip:"Look for nervous players.", correct:"You found a wolf!", incorrect:"You voted out an innocent!", encourage:"Trust no one.", emotion:"😾" }, launch("werewolf")),
      mk("hotseat","HotSeat","💰","The quiz-show ladder: fifteen questions, rising stakes and three lifelines between you and the top prize.","Quiz show", { timerSec: 30, multiplayer: false }, { intro:"Is that your final answer?", tip:"Use your lifelines wisely.", correct:"Correct! You go to the next level.", incorrect:"I'm sorry, the run ends here.", encourage:"You're doing great!", emotion:"😸" }, launch("hotseat")),
      mk("interview","Interview","🎤","The AI interview simulator: rehearse a real job interview against a tireless interviewer, on your own CV and the role you are going for, then read the scored feedback on every answer.","Interview prep with a coach", { timerSec: 0, hints: true, difficulty:"hard", multiplayer: false }, { intro:"Ready when you are — answer like it is the real thing, and the questions get sharper as you go.", tip:"Answer in STAR shape: Situation, Task, Action, Result — and give a number if you can.", correct:"Strong answer — one concrete result was the part that landed.", incorrect:"That answer stayed generic; ground it in one real example next time.", encourage:"Every rehearsal makes the real one easier.", emotion:"😼" }, launch("interview")),
      mk("bb-guesseroo","Guess-eroo","🦘","Deduce the secret answer from clues and yes/no questions.","Guess Who", { multiplayer:true, maxPlayers:8, hints:true }, fb("Use clues like a detective kangaroo!","😼")),
      mk("ww-true-false","True or False","⚖️","Two-button rapid binary quiz.","Wordwall T/F", { timerSec:10 }, fb("True or False — go with your gut!","😼")),
      mk("bb-ta","Trivia Classic","🧠","Classic team grid with questions, teacher checks, points.","Baamboozle Classic", { multiplayer:true, maxPlayers:8, sfx:"buzz" }, fb("Pick a number, answer, then let the teacher check it.","😸")),
      mk("edupoly","EduPoly","🎩","Buy, build and trade your way around the board — the property-trading classic, rebuilt in 3D with your own vocabulary on every square.","Property trading", { multiplayer: true }, { intro:"Time to buy properties!", tip:"Buy everything.", correct:"Nice roll!", incorrect:"You're in jail!", encourage:"Keep building houses.", emotion:"😸" }, launch("edupoly")),
      mk("storycraft","StoryCraft","📜","The GM-run story engine: you build the world, the class decides what happens in it. The projector canvas carries the characters, the story map, the decision flow and a live leaderboard while a second window holds your control panel — a Story Maker tab that writes chapters and prompts from your universe, the universe/template library, live questions to the room, effects, weather and sound, overrides for when the story needs a shove, and an export of the whole session as a recap. Every decision is scored on what the players argued, not just what they picked.","D&D at the board + Choose Your Own Adventure", { timerSec: 0, hints: true, difficulty: "medium", multiplayer: true, maxPlayers: 8 }, { intro:"The world is loaded and waiting — the story only moves when the room decides something.", tip:"Keep the canvas on the projector and the GM panel on your own screen; every tab is live, so changes land on the class immediately.", correct:"Locked in — that choice just wrote the next chapter.", incorrect:"The story pushed back. Ask the room why that went wrong before moving on.", encourage:"A decision nobody argued for is a decision nobody remembers.", emotion:"😽" }, launch("storycraft"))
    ]
  },
  {
    id: "classics_memory",
    name: "Classics & Memory",
    tagline: "Foundation & Puzzles",
    color: "from-sky-400 via-blue-500 to-indigo-600",
    glow: "rgba(59,130,246,0.55)",
    bgImage: BG.study,
    icon: "🧩",
    activities: [
      mk("bb-tictactoe","Tic Tac Toe","❌","Correct answer earns a mark; first three in a row wins.","Tic Tac Toe", { multiplayer:true, maxPlayers:2 }, fb("Answer correctly to place your X or O.","😺")),
      mk("bb-fourrow","Four in a Row","🔴","Correct answers earn discs; first four connected wins.","Connect Four", { multiplayer:true, maxPlayers:2 }, fb("Earn a disc, drop it, connect four.","😸")),
      mk("chess","Chess","♟️","Grandmaster Chess Tutor: play the coach on a real board and work through opening, tactic and endgame lessons with voice-guided hints.","Chess.com", { hints:true, multiplayer:true }, { intro:"Welcome to the board — let's think two moves ahead!", tip:"Control the centre early and every piece gets room to work.", correct:"Brilliant — that is a grandmaster idea!", incorrect:"That drops a piece — take the move back and look again.", encourage:"Every game is a lesson. Keep your king safe first.", emotion:"😼" }, launch("chess")),
      mk("flashcards","Flashcards","🃏","Classic flip-and-study cards with spaced repetition.","Quizlet", { timerSec: 0, hints: true, difficulty:"easy" }, { intro:"Flashcards! Flip, learn, repeat — purrfect for memory.", tip:"Review hard cards three times before moving on.", correct:"Mrrow! That's right!", incorrect:"Almost!", encourage:"Keep flipping!", emotion:"😺" }),
      /*
       * An in-hub card activity, deliberately NOT named `flexcards`: the launched FlexCards
       * app is a tile of its own further down this same group, and two entries sharing one id
       * gave the grid two same-keyed tiles — one of them a dead end with no launchPath.
       */
      mk("multimedia-cards","Multimedia Cards","🎴","Up to 10 sides per card for text, video, audio and more.","Anki", { hints: true, difficulty:"medium" }, { intro:"Multimedia cards stretch your brain!", tip:"Use the audio side first.", correct:"Pawsome!", incorrect:"Try a different side.", encourage:"Explore them all.", emotion:"😻" }),
      mk("bb-storydice","Story Dice","🎲","Roll 1-16 image dice for stories, comparisons, charades, and speaking tasks.","Story Cubes", { multiplayer:true, maxPlayers:8, sfx:"dice" }, fb("Roll the dice and tell a creative story.","😽")),
      mk("bb-doublevision","Double Vision","👀","Find the one image appearing on both side-by-side panels.","Spot the Match", { multiplayer:true, maxPlayers:8, timerSec:30 }, fb("Fast eyes win. Find the duplicate image!","😼")),
      mk("bb-memory","Memory Game","🧠","Flip numbered tiles and match pairs for points.","Concentration", { multiplayer:true, maxPlayers:8, sfx:"flip" }, fb("Flip, remember, match, score!","😻")),
      mk("ww-find-match","Find the Match","🧷","Tap matching pairs in a grid.","Wordwall Find Match", { timerSec:120 }, fb("Find the matching squares — tap quick!","😺")),
      mk("ww-flash-cards","Quick Flashcards","🃏","One-card deck view with flip, swipe, shuffle and difficult-card tracking.","Wordwall Flashcards", { }, fb("Flip and learn — your call.","😻")),
      mk("ww-flip-tiles","Flip Tiles","🔳","Flip two-sided tiles and mark each concept learned or needs review.","Wordwall Flip Tiles", { }, fb("Flip tiles to reveal the hidden explanation.","😺")),
      mk("deck","Deck","🗂️","Immersive 3D flashcards memory tools.","Quizlet", { hints: true, difficulty:"easy" }, { intro:"Let's memorize in 3D!", tip:"Flip and learn.", correct:"Correct!", incorrect:"Keep trying.", encourage:"Almost there.", emotion:"😺" }, launch("deck")),
      mk("flexcards","FlexCards","🎴","3D multi-sided interactive flexcards.","Anki", { hints: true, difficulty:"medium" }, { intro:"Rotate the flexcards!", tip:"Learn every angle.", correct:"Great!", incorrect:"Try again.", encourage:"Explore.", emotion:"😻" }, launch("flexcards"))
    ]
  },
  {
    id: "words_writing",
    name: "Words & Grammar",
    tagline: "Literacy & Language",
    color: "from-amber-400 via-orange-500 to-red-500",
    glow: "rgba(251,146,60,0.55)",
    bgImage: BG.words,
    icon: "✍️",
    activities: [
      mk("lingo","Lingo","🦉","Full gamified language course: AI-built lessons, XP, streaks, hearts, leagues and leaderboards.","Language course", { hints:true, difficulty:"medium" }, { intro:"Hoot! Welcome to Lingo — lesson by lesson, all built from your own material.", tip:"Answer carefully: every mistake costs a heart, every correct answer earns XP.", correct:"Correct! +10 XP — your owl is proud.", incorrect:"Not quite — one heart lost, keep going!", encourage:"Keep the streak alive! 🔥", emotion:"😻" }, launch("lingo", "?continue=1")),
      mk("flix","Flix","🎬","The React video-lesson platform: play any episode with Vidstack, adaptive HLS/DASH through Shaka, dual subtitles and a virtualised interactive transcript, then build video-synced lessons from the AI prompt — every activity timestamped to real speech. Runs in the browser with a local media library.","Video lessons + transcripts", { hints:true, multiplayer:true, difficulty:"medium" }, { intro:"Pick an episode and learn from the scene — subtitles on, notebook open.", tip:"Click any word in the transcript for an explanation, or hit 🔁 to replay the line slowly.", correct:"Great ear! That line is now yours.", incorrect:"Almost — replay the sentence and listen for the linking.", encourage:"Every replay makes the rhythm stick a little more.", emotion:"😻" }, launch("flix")),
      mk("reel","Reel","🍿","Search any film or TV series in the licensed catalogs, play it with dual subtitles and an interactive transcript, search and attach subtitles from four providers, and turn any scene into a video-synced lesson. Runs as its own server app with its own database.","Netflix + LingQ", { hints:true, multiplayer:true, difficulty:"medium" }, { intro:"Popcorn ready? Search a title, then learn from the scenes you actually want to watch.", tip:"Word-level subtitles are clickable — tap any word for an explanation and save it to your vocabulary.", correct:"Captured! That word is yours now.", incorrect:"Close — replay the sentence and listen again.", encourage:"Keep the streak alive, one scene at a time.", emotion:"😻" }, VIDEO_PLATFORM_URL),
      mk("madlibs","MadLibs","🎭","Interactive storytelling game that transforms simple word prompts into a rich story.","Fill-in-the-blank stories", { hints: true, multiplayer: true }, { intro:"Let's build a silly story! Fill in the blanks with your own words.", tip:"The crazier the words, the funnier the story.", correct:"Great word choice!", incorrect:"Make sure it matches the requested type.", encourage:"Your story is coming together!", emotion:"😹" }, launch("madlibs")),
      mk("grammarly","Grammarly Angels & Demons","😇","Paste text and review AI-powered grammar and style suggestions in a gamified way.","Grammarly", { hints: true }, { intro:"Summon the Angels and Demons! Let's polish your text.", tip:"Review demons (errors) and embrace angels.", correct:"Approved! Your writing is ascending.", incorrect:"Rejected!", encourage:"Every text can be refined.", emotion:"😺" }),
      mk("sentenceBuilder","Sentence Builder","🧩","Race against the clock to build scrambled sentences or challenge friends.","Quizlet", { timerSec: 60, hints: true, multiplayer: true }, { intro:"Time to unjumble!", tip:"Use the freeze timer power-up if you get stuck.", correct:"Perfect syntax!", incorrect:"Wait, that's not right.", encourage:"Keep the pieces moving!", emotion:"😸" }),
      mk("culturalSnapshot","Cultural Snapshot","📷","Read a cultural post in an Instagram format and answer interactive questions.","Instagram", { hints: true }, { intro:"Welcome to Culture Daily!", tip:"Pay attention to hashtags.", correct:"Spot on!", incorrect:"Review the text.", encourage:"Context helps!", emotion:"😻" }),
      mk("ww-quiz","Quiz","❓","Multiple choice with optional time limit and lives.","Wordwall Quiz", { timerSec:30, hints:false }, fb("Quiz time! Pick the best answer.","😸")),
      mk("ww-match","Match Up","🔗","Drag to match keywords with definitions.","Wordwall Match", { }, fb("Drag the right pairs together.","😻")),
      mk("ww-group-sort","Group Sort","🗂️","Drag items into the correct categories.","Wordwall Sort", { }, fb("Sort each item into its group.","😻")),
      mk("ww-missing-word","Missing Word","🕳️","Drag-and-drop fill-in-the-blank.","Wordwall Missing Word", { hints:true }, fb("Drop the right word into the gap.","😸")),
      mk("ww-anagram","Anagram","🔠","Drag letters into the right order.","Wordwall Anagram", { timerSec:60 }, fb("Rearrange the letters to spell the word.","😹")),
      mk("ww-unjumble","Unscramble","🧶","Reorder scrambled word blocks into the correct sentence.","Wordwall Unjumble", { }, fb("Untangle the sentence — order matters!","😹")),
      mk("ww-wordsearch","Wordsearch","🔍","Find words hidden in a letter grid.","Wordwall Wordsearch", { timerSec:300 }, fb("Hunt down the hidden words!","😼")),
      mk("bb-baamboozle","Baamboozle Classic","🐼","Classic team grid with questions, teacher checks, points, and power-ups.","Baamboozle Classic", { multiplayer:true, maxPlayers:8, sfx:"buzz" }, fb("Pick a number, answer, then let the teacher check it.","😸")),
      mk("feed","Feed","📸","Scroll through micro-lessons in a social feed format.","Social feed", { hints: true }, { intro:"Ready for a quick scroll?", tip:"Swipe to learn.", correct:"Well spotted!", incorrect:"Watch the video again.", encourage:"Keep swiping!", emotion:"😸" }, launch("feed"))
    ]
  },
  {
    /**
     * SPEAKING & CLASSROOM — the two halves of the classroom speaking platform.
     *
     * Both arrived as byte-identical copies of one app (`gamified-language-learning-
     * platform` and `…platform5`), which the convention forbids twice over: a
     * hyphenated folder name, and two tiles nobody could tell apart. They are one
     * tutor's lesson from two angles now, and they cross-link to each other:
     *
     *   talkarena — run the room: grid rounds, drawing with webcam AI, nine timed
     *               debate stages, a pressure-free practice room, and a teaching
     *               plan built from what the class actually got wrong.
     *   shoutout  — the arcade: words rain into the camera feed and the class shouts
     *               them before the room floods, in team waves, ending with the words
     *               that beat them as tomorrow's revision list.
     */
    id: "speaking_classroom",
    name: "Speaking & Classroom",
    tagline: "Get the whole class talking",
    color: "from-indigo-500 via-violet-600 to-fuchsia-600",
    glow: "rgba(124,58,237,0.55)",
    bgImage: BG.team,
    icon: "🗣️",
    activities: [
      mk("talkarena","TalkArena","🗣️","Run the whole lesson from one screen: a grid of hard cards with a mini lesson on every miss and a speaking task on every hit, Pictionary Studio with webcam Sketch-Sense AI, nine timed debate stages with a live talk-time meter, a pressure-free practice room — then a teaching plan built from what the class actually got wrong, one tap to re-ask the misses.","Quizlet Live + a debate club", { timerSec: 45, hints: true, multiplayer: true, maxPlayers: 8, difficulty: "medium" }, { intro:"Set the room, then play: cards, drawing, debate or practice — and nobody scores until somebody speaks a full sentence.", tip:"Every correct card triggers its talk task: 45 seconds, no passing. Wrong answers are worth more than right ones — the mini lesson is the prize.", correct:"Correct — now say it: the talk task on this card is yours.", incorrect:"Not this time. Read the mini lesson out loud — that is the part they remember.", encourage:"Talk time is the score that matters. Keep the sentences coming.", emotion:"😼" }, launch("talkarena")),
      mk("shoutout","ShoutOut","🫧","The emoji flood arcade: words rain into your camera feed and the class shouts the name, popping every copy of it at once. Team waves rotate the shout-out, three paces set the whole difficulty, your own vocabulary list pastes straight in — and the scoreboard ends with the words that beat you, ready for tomorrow's warm-up.","Heads Up + Fruit Ninja", { hints: true, multiplayer: true, maxPlayers: 8, difficulty: "medium" }, { intro:"Words are falling — shout one and every copy pops. Let too many land and the room floods!", tip:"Shout the whole word, not the letter. Clear 90% of a wave and it is saved; the words that land come back as your revision list.", correct:"Popped! Every copy of that word is gone.", incorrect:"No such word in play — and the fall just got faster!", encourage:"Keep the shout-out going: volume beats caution.", emotion:"😹" }, launch("shoutout")),
      mk("party","Party","🎉","The classroom game show: one lesson turns into seventeen game environments on one tutor-controlled screen — a 64-tile Grid Arena with a colour-coded mini lesson behind every answer, Texas Hold'em where the cards are your questions, a bomb-defusal round kept alive by talking, Mafia and Spyfall, an auction, a debate stage with timed crossfire — plus a luck deck of seventeen cards, power-ups teams buy with their points, a phone room for the learners, and a score sheet that ends in a teaching plan built from what the class actually got wrong.","Kahoot + a game-show night", { timerSec: 45, hints: true, difficulty: "medium", multiplayer: true, maxPlayers: 24 }, { intro:"Lights up — one board, seventeen games, and every answer becomes a mini lesson.", tip:"Pick the game from the setup screen, then drive everything from the header: switch games, read a guide aloud, hand out power-ups, or open the score sheet at any time.", correct:"That answer just paid for itself — read the mini lesson out loud before the next tile.", incorrect:"Not this time. The card explains the rule; that explanation is the real prize.", encourage:"Keep the room talking — the score only matters if they are saying the sentences.", emotion:"😼" }, launch("party")),
      mk("speedreader","SpeedReader","⚡","The projector karaoke-shadowing arena. Pick one of eight themed scenes — street circuit, orbit launch, title fight, vault heist, neon drift, whiteout, maelstrom — and your voice becomes the throttle: read the passage aloud, get word-level pronunciation scoring and a live words-per-minute readout, and a ghost car holds the record pace you are chasing. Team waves rotate the shout-out on a shared scoreboard, mic strictness slides from forgiving to exam-grade, and Practice Studio gives unlimited PTE Read Aloud takes with IPA, native-model audio and full diagnostics.","PTE Read Aloud + karaoke shadowing", { timerSec: 0, hints: true, difficulty: "medium", multiplayer: true, maxPlayers: 8 }, { intro:"Voices ready? The ghost is already moving — read cleanly and the room stays ahead of it.", tip:"Do not stop at a stumble: the ghost only gains on silence. One clear sentence beats two rushed ones.", correct:"Clean read — the needle just moved your way.", incorrect:"That one broke the rhythm. Watch the highlighted word and keep going.", encourage:"Pace comes on its own once you stop listening to yourself.", emotion:"😼" }, launch("speedreader"))
    ]
  }
];

/**
 * Kids' Corner — its own section, its own audience folder, its own look.
 *
 * A kid game is added by putting its built folder in `tutorly-games/kids/<folder>/`
 * (so `tutorly-games/kids/<folder>/index.html` exists) and adding one entry here:
 *
 *   mk("animal-sounds","Animal Sounds","🐮","Match the animal to its sound.",
 *      "Listening game", { timerSec: 60, difficulty: "easy", multiplayer: false },
 *      fb("Tap the animal that makes this sound!", "😺"), launchKids("animal-sounds")),
 *
 * THE KIDS' NAMING CONVENTION — follow it for every game added later anyway:
 *
 *   1. The folder is a single lower-case word, no hyphens: `wordpop`. The folder
 *      name IS the URL, so it is the one thing that is hard to change later.
 *   2. The in-app name is that word in CamelCase: `WordPop`, `LearnLoop`.
 *   3. Name the game after what the CHILD DOES (pop words, loop a lesson, play
 *      school), never after what it teaches — a four-year-old cannot read
 *      "Bilingual Vocabulary Trainer", but they can ask for the balloon game.
 *   4. Say the name out loud: it must be unambiguous over a video call and it must
 *      not collide with a sibling game (`wordpop` / `playschool`, not two words).
 *   5. Keep the tile's emoji and blurb about the play, and make sure the tile
 *      calls `launchKids("<folder>")` so a broken folder shows up immediately.
 *   6. A renamed game keeps its TILE id (`mk`'s first argument) only if the old id
 *      is unused; otherwise give it a new id and add the old folder to the legacy
 *      list in `scripts/collect-standalone-apps.mjs` so no stale build survives.
 *
 * Activities without a launch path open as hub-built studios, exactly like the
 * grown-up ones.
 */
export const KIDS_CATEGORY: Category = {
  id: "kids_corner",
  name: "Kids' Corner",
  tagline: "Playful games for younger learners",
  color: "from-sky-300 via-emerald-300 to-pink-300",
  glow: "rgba(56,189,248,0.55)",
  bgImage: BG.kids,
  icon: "🧸",
  activities: [
    mk(
      "wordpop",
      "WordPop",
      "🎈",
      "The first-words arcade for ages 3–6. Whole topic areas of illustrated cards, six games for each one (Learn, Chant, Quiz, Match, Memory, Touch it!) and every card read aloud in six languages with the free Microsoft natural voices. Every topic also has a timed lesson plan with the tutor's script, and an AI prompt can write new topic areas or new plans from pasted JSON.",
      "Flashcards + Duolingo ABC",
      { timerSec: 0, hints: true, difficulty: "easy", multiplayer: false },
      {
        intro: "Let's say the words together — tap a card and listen!",
        tip: "Tap the card to hear the word again; 🐢 reads it slowly, one sound at a time.",
        correct: "Purrfect — say it with me!",
        incorrect: "Nearly! Listen once more, then try again.",
        encourage: "Every word you say makes the next one easier!",
        emotion: "😻",
      },
      launchKids("wordpop"),
    ),
    mk(
      "learnloop",
      "LearnLoop",
      "🔁",
      "A tutor-led lesson loop for ages 3–6: pick a theme and a unit, then loop it through eleven modes — Learn, Talk, Listen, Quiz, Match, Memory, Sort, Opposites, Chant, Count and ABC — with concept-check questions, chants and talk time. Includes a tutor panel for learners and results, a voice test, a timed lesson plan for every unit, and an AI prompt that turns pasted JSON into new lessons or new plans.",
      "Tutor-led bilingual lessons",
      { timerSec: 0, hints: true, difficulty: "easy", multiplayer: false },
      {
        intro: "Same loop every time: listen, say it, play it.",
        tip: "Use the dock on the left to pick the unit, the bar on top to pick the mode.",
        correct: "That's it — say it once more, all by yourself!",
        incorrect: "Almost! Listen one more time, then copy me.",
        encourage: "You are getting faster every loop!",
        emotion: "😺",
      },
      launchKids("learnloop"),
    ),
    mk(
      "bilibuddies",
      "BiliBuddies",
      "📖",
      "A bilingual picture dictionary and pronunciation studio for ages 4–8: browse illustrated word books, hear every entry in both languages with the free Microsoft natural voices, and record the child saying it back. Save several learners, keep their word lists and revisit the ones that are still wobbly. Every word set also has a timed lesson plan with the tutor's script, and an AI prompt can write new themes or new plans.",
      "Picture dictionary + voice studio",
      { timerSec: 0, hints: true, difficulty: "easy", multiplayer: false },
      {
        intro: "Pick a word book and listen to both languages.",
        tip: "Tap a card to hear it, then press the microphone and say it back.",
        correct: "Clear as a bell — the dictionary heard you!",
        incorrect: "Try once more, a little slower this time.",
        encourage: "Two languages, one word at a time!",
        emotion: "🐼",
      },
      launchKids("bilibuddies"),
    ),
    mk(
      "playschool",
      "PlaySchool",
      "🛝",
      "A sunny playground of lessons for ages 3–6: letters and phonics, numbers and counting to twenty, first words, chants and sorting — with ten games, from sand-tray letter tracing and echo monsters to the sentence train, the dressing room and a magic-camera hunt. Every unit also has a complete timed lesson plan with the tutor's script, and an AI prompt can write new themes or new plans.",
      "Nursery curriculum + games",
      { timerSec: 0, hints: true, difficulty: "easy", multiplayer: false },
      {
        intro: "Welcome to the playground — where shall we start?",
        tip: "Letters, numbers or first words: tap a theme and pick a game along the top.",
        correct: "Brilliant! Say it out loud for me once more.",
        incorrect: "Not quite — look again, you are close!",
        encourage: "Every try makes your brain stronger!",
        emotion: "🦊",
      },
      launchKids("playschool"),
    ),
    mk(
      "toybox",
      "ToyBox",
      "🧸",
      "A whole toy box of little studios for ages 3–6: draw letters in the sandbox, echo words to Momo the monster, blend sounds into smoothies, hunt real objects on camera, make faces in the feelings mirror, act out charades, build sentences on the talking train, find Teddy in the dollhouse and dress Pip. Draws on a garden of 500+ illustrated words read aloud in six languages, and every unit comes with ready-to-play lessons — plus an AI prompt that turns pasted JSON into a brand-new category pack or a timed lesson plan.",
      "Montessori playroom + language",
      { timerSec: 0, hints: true, difficulty: "easy", multiplayer: false },
      {
        intro: "Welcome to your ToyBox — pick a little adventure and let's play!",
        tip: "Drag with the mouse or a finger; every drag also works as a tap.",
        correct: "Wonderful! Say it out loud with me once more.",
        incorrect: "Almost — listen once more, then try again.",
        encourage: "Little hands, big discoveries!",
        emotion: "🧸",
      },
      launchKids("toybox"),
    ),
    mk(
      "heroarcade",
      "HeroArcade",
      "🦸",
      "An arcade of bilingual speaking games for ages 6–12: 58 themes, each with its own word list, concept-check questions, chant, quiz, matching game, a hero story starring Max, Lina, Kai, Zara and Bolt, and eight speaking games — dragon feeder, walkie-talkie riddles, puppet theatre, marketplace, voice maze, detective, telephone monsters and rocket boosters. Seven languages read aloud with the natural child voices, and both new themes and timed lesson plans can be added by pasting JSON from an AI.",
      "Speaking games + hero stories",
      { timerSec: 0, hints: true, difficulty: "medium", multiplayer: false },
      {
        intro: "Pick a theme and let's speak — the heroes are listening!",
        tip: "Tap 📋 Lesson Plan for a ready-made walkthrough with the words to say.",
        correct: "Yes! Now say the whole sentence by yourself.",
        incorrect: "Close! Listen again, then answer in a full sentence.",
        encourage: "Say it loud, say it proud — every try is a win!",
        emotion: "🦸",
      },
      launchKids("heroarcade"),
    ),
    mk(
      "talkquest",
      "TalkQuest",
      "💬",
      "A speaking mission for every topic for ages 5–12: 56 topics × 20 illustrated words, each turning into a full lesson — word cards, a sentence for every word, a chant, concept-check questions, a quiz, a matching game, a short story with comprehension questions and a talk-time challenge — plus a timed tutor plan and ten speaking games. Seven languages read aloud, easy kid-level wording throughout, and both new topics and lesson plans can be added by pasting JSON straight from an AI.",
      "Bilingual speaking missions",
      { timerSec: 0, hints: true, difficulty: "easy", multiplayer: false },
      {
        intro: "Let's go on a talking mission — words first, then we speak!",
        tip: "Tap 📋 Lesson Plan for the timed walkthrough, and 🎤 Voices to check the read-aloud voice.",
        correct: "Yes! Say the whole sentence by yourself now.",
        incorrect: "Good try — listen one more time and say it with me.",
        encourage: "Every sentence out loud is a win!",
        emotion: "💬",
      },
      launchKids("talkquest"),
    ),
  ],
};

/** Shown as dashed cards while the Kids' Corner is still being filled. */
export const KIDS_COMING_SOON: Array<{ emoji: string; name: string; hint: string }> = [
  { emoji: "🎵", name: "RhymeTime", hint: "Find the words that rhyme" },
  { emoji: "📖", name: "StoryBuilder", hint: "Grow a story one sentence at a time" },
  { emoji: "🐣", name: "AnimalHomes", hint: "Who lives where?" },
  { emoji: "🌦️", name: "WeatherWindow", hint: "Dress for the day" },
  { emoji: "🔷", name: "ShapeHunt", hint: "Spot the shapes around you" },
];

export const KIDS_ACTIVITY_COUNT = KIDS_CATEGORY.activities.length;

export const ALL_ACTIVITIES: Activity[] = [...CATEGORIES.flatMap(c => c.activities), ...KIDS_CATEGORY.activities];
/** Grown-up activities only — the header count, chips and search all use this. */
export const ADULT_ACTIVITY_COUNT = ALL_ACTIVITIES.length - KIDS_ACTIVITY_COUNT;
export const ACTIVITY_COUNT = ALL_ACTIVITIES.length;
