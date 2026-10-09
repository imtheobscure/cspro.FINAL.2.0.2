import type { Question } from "./build";
import { QUESTIONS_A } from "./questions-a";
import { QUESTIONS_B } from "./questions-b";

export const GRID_QUESTIONS: Question[] = [...QUESTIONS_A, ...QUESTIONS_B];

export type GameKey =
  | "practice" | "grid" | "speed" | "pictionary" | "concept" | "translation"
  | "forbidden" | "alibi" | "keeptalking" | "sentiment" | "spyfall" | "mafia"
  | "sell" | "mission" | "poker" | "story" | "debate";

export type GameDef = {
  key: GameKey;
  n: number;
  name: string;
  emoji: string;
  tag: string;
  blurb: string;
  guide: string[];
  rounds: number;
  music: "lobby" | "arena" | "tension" | "noir" | "lounge" | "whimsy" | "chase";
  accent: string;
};

export const GAMES: GameDef[] = [
  { key: "practice", n: 1, name: "Practice Mode", emoji: "🗂️", tag: "Calm revision", rounds: 52, music: "lobby", accent: "#38bdf8",
    blurb: "Every Grid Arena card as a flip deck. Question on the front, answer plus mini lesson on the back. No timer, no score.",
    guide: ["This is the revision pass, so nothing is scored and nothing is timed.",
      "Click a card to flip it. The back carries the full colour-coded mini lesson.",
      "Use the arrows to move through the deck, and Shuffle to change the order.",
      "Read Aloud speaks the card in the narrator voice you chose."] },
  { key: "grid", n: 2, name: "The Grid Arena", emoji: "🎯", tag: "Main event", rounds: 64, music: "arena", accent: "#f59e0b",
    blurb: "Sixty-four numbered tiles hiding questions, luck cards and power-up pick-ups. Streaks build bonuses; the last tile ends the game.",
    guide: ["Teams take turns choosing a numbered tile.",
      "A tile hides a question, a luck card from the deck of seventeen, or a power-up pick-up.",
      "Correct answers win the tile's points plus a streak bonus. Wrong answers cost the same points.",
      "Judge out-loud answers with the Correct and Wrong buttons, or let the class tap an option.",
      "After every answer the card becomes a mini lesson. Teach from it before you move on.",
      "When the final tile is taken, the score sheet and the teaching plan open automatically."] },
  { key: "speed", n: 3, name: "Speed Reader", emoji: "🎤", tag: "Shadowing · 5 takes", rounds: 5, music: "chase", accent: "#22d3ee",
    blurb: "PTE-style read aloud. Karaoke highlighting, live speech recognition, words-per-minute and a pronunciation report after every take.",
    guide: ["Press Record and read the text as accurately and quickly as you can.",
      "Words turn green as the recogniser hears them and amber when it hears something close.",
      "Each learner gets five takes; the best words-per-minute becomes the record for that text.",
      "The report lists missed words, mispronounced words and your accuracy percentage.",
      "Aim for the target speed shown above the text, not faster — accuracy scores higher than speed."] },
  { key: "pictionary", n: 4, name: "Pictionary", emoji: "🖌️", tag: "Draw & guess · 6 rounds", rounds: 6, music: "whimsy", accent: "#a78bfa",
    blurb: "A full drawing surface: pen, marker, magic shape pen, eraser, colours, thickness, emoji stamps and a poseable stick figure you can flip.",
    guide: ["The secret word stays hidden until you press Reveal or Copy.",
      "Pen draws freehand, Marker is thick and soft, Magic Pen snaps your wobbly line into a clean shape.",
      "Drag the stick figure's joints to build a pose, and flip it to change the figure.",
      "Stamps drop emoji onto the canvas for speed.",
      "The guessing team shouts answers; tap Got it to score and move to the next word."] },
  { key: "concept", n: 5, name: "Concept Link", emoji: "🧩", tag: "Guessing · 8 rounds", rounds: 8, music: "tension", accent: "#34d399",
    blurb: "Five emoji clues revealed one at a time. The class works out the single hidden concept that connects all five.",
    guide: ["Reveal one clue at a time. Fewer clues used means more points.",
      "No clue names the answer, and one clue in every round is a deliberate red herring.",
      "Three written hints are available if the class stalls.",
      "Accept close synonyms — the explanation afterwards tells you what the trap was."] },
  { key: "translation", n: 6, name: "Translation Trap", emoji: "🪤", tag: "L1 → natural English · 8 rounds", rounds: 8, music: "whimsy", accent: "#fb7185",
    blurb: "A story appears line by line in the learner's first language. They must express the idea naturally, not translate it word for word.",
    guide: ["Read the line in the learner's language aloud, or let a learner read it.",
      "The class produces a natural English version. Do not accept the literal one.",
      "Reveal the literal translation to show exactly where the trap was.",
      "Then reveal the natural version and the grammar point behind it."] },
  { key: "forbidden", n: 7, name: "Forbidden Answer", emoji: "🚫", tag: "Interrogation · 10 rounds", rounds: 10, music: "tension", accent: "#f97316",
    blurb: "Questions engineered to pull a one-word answer out of the learner — while yes, no, maybe and every hedge are banned.",
    guide: ["Ask the question. The banned words are shown on screen for the whole room to police.",
      "If the learner uses a banned word, the buzzer sounds and the turn passes.",
      "Surviving the full question wins the points; a model answer is available afterwards.",
      "Increase the pressure by adding a ten-second timer from the header."] },
  { key: "alibi", n: 8, name: "Alibi Puzzle", emoji: "🕵️", tag: "Deduction · 5 cases", rounds: 5, music: "noir", accent: "#60a5fa",
    blurb: "Five suspects, five long alibis, one liar whose story contradicts the case facts. The class interrogates, then accuses.",
    guide: ["Read the scene and the case facts aloud, or use Read Aloud.",
      "Each suspect can be opened and read in their own voice.",
      "The class may ask the four suggested interrogation questions of any suspect.",
      "Lock in one accusation. The reveal quotes the exact contradiction that gives the liar away."] },
  { key: "keeptalking", n: 9, name: "Keep Talking", emoji: "💣", tag: "Bomb defusal · 8 topics", rounds: 8, music: "tension", accent: "#ef4444",
    blurb: "A live countdown, a siren and a microphone volume sensor. Silence drains the timer; speaking keeps the bomb alive.",
    guide: ["Allow microphone access so the meter can hear the room.",
      "The timer drains faster when the room goes quiet — speaking refills it slowly.",
      "Tick off each language task as the speaker completes it; every task adds five seconds.",
      "Complete the task list before the timer hits zero to defuse it."] },
  { key: "sentiment", n: 10, name: "Sentiment Analyst", emoji: "🎭", tag: "Performance · 10 rounds", rounds: 10, music: "whimsy", accent: "#c084fc",
    blurb: "One line, one demanded emotion. Record, play it back, and let the class judge whether the tone actually landed.",
    guide: ["Show the line and the emotion. Give the performer ten seconds of thinking time.",
      "Record the performance, then play it back to the room before anyone votes.",
      "The class votes landed or missed; the coaching note explains the prosody.",
      "Run the same line with a second emotion to hear the contrast."] },
  { key: "spyfall", n: 11, name: "Spyfall", emoji: "🔍", tag: "Bluffing · 6 locations", rounds: 6, music: "noir", accent: "#f472b6",
    blurb: "Everyone shares a location except the spy. Players question each other to prove they belong and expose the bluffer.",
    guide: ["Pass the board, or use the phone room so each learner sees only their own card.",
      "Everyone receives the location and a role; one player receives SPY.",
      "Players ask each other one question at a time. Answers must be specific but not obvious.",
      "Anyone may call a vote. If the spy is caught they may still win by naming the location."] },
  { key: "mafia", n: 12, name: "Mafia & Werewolf", emoji: "🐺", tag: "Social deduction · 5 casts", rounds: 5, music: "noir", accent: "#94a3b8",
    blurb: "Eight characters, eight statements, exactly two hidden villains. Difficulty decides how many tells are dealt.",
    guide: ["Read the eight statements aloud one at a time, each in its own voice if you like.",
      "Nothing in a statement names a role: every line fits at least two characters.",
      "Easy deals three tells, Standard two, Brutal none. The same cast replays harder.",
      "Lock the accusation to reveal every role, the real tell quoted, and who accused whom.",
      "Copy the report, then re-deal the same cast at a harder setting."] },
  { key: "sell", n: 13, name: "Sell This!", emoji: "💰", tag: "Auction · 10 lots", rounds: 10, music: "lounge", accent: "#eab308",
    blurb: "Sixty seconds to sell something absurd. Four NPC bidders raise their offers the more — and the better — the learner speaks.",
    guide: ["Reveal the object and start the clock.",
      "Live transcription feeds the bidders: more speech raises bids, and B2+ vocabulary raises them faster.",
      "Each NPC rewards something different — adjectives, numbers, objections, stories.",
      "The tutor can place a manual bid at any time to push the learner harder.",
      "Beat the reserve price to win the lot."] },
  { key: "mission", n: 14, name: "Secret Mission", emoji: "🎯", tag: "Hidden goals · 12 missions", rounds: 12, music: "lounge", accent: "#2dd4bf",
    blurb: "Each player gets a secret conversational objective. One player never looks — when the target performs the action, the mission is won.",
    guide: ["Deal one mission card per player. The target player must look away while it is read.",
      "Missions are functional language goals: make someone disagree, get advice, trigger a prediction.",
      "Play a normal conversation on any topic for three to five minutes.",
      "When the target performs the action, tap Mission accomplished and reveal the card."] },
  { key: "poker", n: 15, name: "Texas Hold'em", emoji: "🃏", tag: "52 question cards", rounds: 8, music: "lounge", accent: "#4ade80",
    blurb: "A real hold'em table where every card is a question. Answer correctly to swap a card. Bet, call, raise or fold against the NPCs.",
    guide: ["Every one of the 52 cards carries a question; the high cards carry the hard ones.",
      "On your turn you may attempt a question to exchange one card in your hand.",
      "Answer correctly and the swap happens; answer wrongly and the card stays and you pay a blind.",
      "Betting is standard hold'em: check, call, raise or fold across four streets.",
      "The remaining deck is visible so the class can calculate what is still out there."] },
  { key: "story", n: 16, name: "Finish My Story", emoji: "📖", tag: "Improvisation · 6 openers", rounds: 6, music: "whimsy", accent: "#818cf8",
    blurb: "A strange opening line and a 30-second clock. Vocabulary drops onto the screen and must be used before it expires.",
    guide: ["Read the opener aloud, then start the clock.",
      "Vocabulary appears every few seconds and must be used before it fades.",
      "Live transcription highlights each word as it is caught.",
      "Use the twist card if the speaker dries up — it forces a new direction."] },
  { key: "debate", n: 17, name: "Debate Arena", emoji: "⚖️", tag: "12 motions · timed format", rounds: 12, music: "arena", accent: "#fbbf24",
    blurb: "A full competitive debate stage: motions, prepared arguments for both sides, crossfire timing, target language and a five-point rubric.",
    guide: ["Pick a motion and assign For and Against. Heat 3 motions divide a room fastest.",
      "Prep time is timed and silent for the first thirty seconds.",
      "Run the phases in order; the timer sounds a bell at each change.",
      "Score both teams live on the five-point rubric, and save the result to the session.",
      "Finish with the curveball — it forces new language out of a settled debate."] },
];

export const GAME_BY_KEY = Object.fromEntries(GAMES.map((g) => [g.key, g])) as Record<GameKey, GameDef>;

/* ---------- Poker: 52 of the 64 questions become playing cards ---------- */
export const SUITS = ["♠", "♥", "♦", "♣"] as const;
export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

export type PokerCard = { code: string; rank: string; suit: string; value: number; question: Question };

export function buildPokerDeck(questions: Question[]): PokerCard[] {
  const hard = questions.filter((x) => x.difficulty === "hard");
  const medium = questions.filter((x) => x.difficulty === "medium");
  const easy = questions.filter((x) => x.difficulty === "easy");
  const pick = (pool: Question[], i: number) => pool[i % pool.length];
  const deck: PokerCard[] = [];
  let hi = 0, mi = 0, ei = 0;
  RANKS.forEach((rank, r) => {
    SUITS.forEach((suit) => {
      // High cards (J,Q,K,A and 10) are the hand-makers, so they carry the hard questions.
      const question = r >= 9 ? pick(hard, hi++) : r >= 4 ? pick(medium, mi++) : pick(easy, ei++);
      deck.push({ code: `${rank}${suit}`, rank, suit, value: r + 2, question });
    });
  });
  return deck;
}
