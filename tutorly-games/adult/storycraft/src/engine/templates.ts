import type { UniverseTemplate } from "./types";

export { SOCIAL_PRESETS } from "./defaults";

/**
 * HYPER-DETAILED, OPINIONATED generation templates.
 * Each template contains a long-form "system" prompt that the Story Maker
 * injects verbatim into the AI's instructions, plus a strict set of
 * required scenes, items, widgets, sounds, card patterns, and rules.
 *
 * The result: every time the GM copies the prompt, the AI is FORCED to
 * produce a hyper-realistic, card-based, fully interactive chapter that
 * 100% integrates with the canvas (leaderboard, inventory, decisions,
 * read-aloud on click, widgets, items, atmosphere, sounds).
 *
 * NOTE: every card MUST contain a "Read aloud" section that activates
 * ONLY when the user clicks the card. NO automatic TTS loops.
 */

export const UNIVERSE_TEMPLATES: UniverseTemplate[] = [
  {
    id: "video-game",
    label: "Video Game",
    icon: "🎮",
    blurb: "Quest-driven interactive adventure. The AI builds a hyper-realistic game environment with items, decisions, and live read-aloud cards.",
    system: `TEMPLATE: VIDEO GAME ADVENTURE

You are generating a turn-based interactive adventure. The output must look, feel, and behave like a hyper-realistic AAA browser game scene, but structured around CARDS that the player clicks to advance and read aloud.

REQUIRED SCENE STRUCTURE (in this order):
1. INTRO — Cinematic title card. Big universe name, narrator's opening line, atmospheric stock background image (use real Unsplash URLs that match the universe). A button "▶ Begin Adventure".
2. CAST — A grid of character cards (one per player and NPC). Each card has a "Read aloud" button (calls awRead(text, voice)). Clicking it speaks the character's intro using their assigned voice. A button "▶ How to Play".
3. HOW TO PLAY — Three to six numbered rules describing quest flow: explore cards → read aloud → take items → trigger effects → make decisions → win. Button "▶ Start Quest".
4. QUEST — The actual hyper-realistic game environment. Card grid of 8-12 interactive quest cards. Each card has a clear objective, a "Read aloud" button, and clickable action buttons. Items are picked up via awItem() and appear on the player in the leaderboard (NO separate inventory panel). Include a quest log and at least one decision card per player.

CRITICAL INTERACTION RULES:
- Every card MUST have a "🔊 Read aloud" button that, when clicked, calls awRead(text, voice) — the canvas automatically speaks using that NPC's voice.
- NO automatic TTS loops. Reading must ONLY happen on user click.
- Items are collected with awItem(emoji,name,rarity) and appear on the SELECTED player in the leaderboard. Do NOT build a separate inventory panel.
- Each decision card MUST have exactly three options. Each option is a button.
- Every button MUST speak its label aloud when clicked (using awRead).`,
    defaultRoles: [
      { role: "Quest Giver", emoji: "📜", alignment: "Guide", brief: "Hands out quests, explains world rules, rewards completion." },
      { role: "Merchant", emoji: "🛒", alignment: "Helper", brief: "Sells items, exchanges rewards, hints at locations." },
      { role: "Mentor", emoji: "🧙", alignment: "Ally", brief: "Teaches lore, gives tutorials, hands out power-ups." },
      { role: "Antagonist", emoji: "👹", alignment: "Hostile", brief: "Opposes the party, gives ultimatums, drops twists." },
      { role: "Wildcard Ally", emoji: "🗝️", alignment: "Shifty", brief: "Offers deals, side-quests, surprise help." },
    ],
    requiredWidgets: [
      { widget: "questlog", title: "Quest Log", purpose: "Show the active and completed quests in a clean panel." },
      { widget: "minimap", title: "Region Map", purpose: "Visual reference of zones, clickable to move or peek." },
      { widget: "clues", title: "Clue Board", purpose: "Show discovered clues, connect them visually." },
      { widget: "timer", title: "Quest Timer", purpose: "A live countdown via awTimer(seconds,'id')." },
    ],
    itemArchetypes: [
      { name: "Healing Potion", emoji: "🧪", rarity: "common", purpose: "Restore health when consumed." },
      { name: "Iron Key", emoji: "🗝️", rarity: "rare", purpose: "Unlocks a sealed door; required to advance." },
      { name: "Ancient Map", emoji: "🗺️", rarity: "epic", purpose: "Reveals a hidden location on the minimap." },
      { name: "Dragon Scale", emoji: "🐉", rarity: "legendary", purpose: "Crafting ingredient for an ultimate weapon." },
      { name: "Mystic Orb", emoji: "🔮", rarity: "epic", purpose: "Once-per-scene hint: reveals one hidden decision option." },
    ],
    soundArchetypes: [
      { key: "ambient-tense", search: "cinematic dark ambient loop", emoji: "🌫️" },
      { key: "victory", search: "epic victory fanfare", emoji: "🏆" },
      { key: "click-ui", search: "UI button click", emoji: "🔊" },
      { key: "discovery", search: "magical discovery chime", emoji: "✨" },
    ],
    requiredScenes: [
      { title: "Intro", minLines: 8, must: ["title card", "narrator opening", "stock background image", "Begin button"] },
      { title: "Cast", minLines: 12, must: ["card per character", "Read aloud button on every card", "How to Play button"] },
      { title: "How to Play", minLines: 8, must: ["3-6 numbered rules", "Start Quest button"] },
      { title: "Quest", minLines: 50, must: ["8-12 quest cards", "every card has Read aloud", "awItem pickups (no inventory panel)", "quest log widget", "3 decision cards", "twist", "particle system"] },
    ],
    cardPatterns: [
      {
        name: "Read-aloud card",
        description: "Every meaningful card has a 🔊 button that calls awRead().",
        code: "<button class='aw-read' onclick=\"awRead(this.dataset.text, this.dataset.voice)\">🔊 Read aloud</button>",
      },
      {
        name: "Item pickup card",
        description: "Clicking adds the item to the selected player on the leaderboard and announces it.",
        code: "<button onclick=\"awItem(this.dataset.id, this.dataset.emoji, this.dataset.name, this.dataset.rarity)\">Pick up</button>",
      },
      {
        name: "Decision card",
        description: "Three explicit option buttons.",
        code: "<div class='aw-decision'><button>Option A</button><button>Option B</button><button>Option C</button></div>",
      },
    ],
    rules: [
      "Use a hidden <div class='aw-opening' hidden>...</div> with the narrator's opening line.",
      "Every card must include a Read aloud button bound to awRead(text, voiceURI).",
      "Embed data-aw=\"item\" triggers for every item the player can pick up.",
      "Embed data-aw=\"prompt\" triggers for every decision card (one per player).",
      "Embed data-aw=\"widget\" triggers for the quest log and minimap. Items go to the leaderboard via awItem — no inventory widget.",
      "Embed data-aw=\"speak\" triggers for at least 6 spoken lines (mix of narrator and NPCs).",
      "Stock images must be real Unsplash URLs that match the universe exactly.",
      "All CSS/JS must be scoped to .aw-scene — no global selectors, no !important on globals.",
      "Banned: mountains, generic rain, empty castles, abstract gradient backgrounds, lorem ipsum, TODO.",
    ],
  },

  {
    id: "movie-tv",
    label: "Movie / TV Series",
    icon: "🎬",
    blurb: "Episode-style cinematic adventure. The AI builds a hyper-realistic episode with scenes, drama, and live read-aloud cards.",
    system: `TEMPLATE: MOVIE / TV EPISODE

You are generating a turn-based, episode-style interactive scene. The output must look, feel, and behave like a hyper-realistic TV episode browser game, structured around SCENE CARDS that the player clicks to advance and read aloud.

REQUIRED SCENE STRUCTURE:
1. INTRO — Episode title card, season/episode number, narrator's cold-open. Big "▶ Play Episode".
2. CAST — A grid of character cards (one per player and NPC). Each card has a "🔊 Read aloud" button that speaks the character's bio using their voice. Button "▶ How to Watch".
3. HOW TO WATCH — Three to six rules describing how to engage: watch scene cards → read dialogue aloud → take action choices → affect the next scene. Button "▶ Start Episode".
4. EPISODE — Hyper-realistic cinematic environment with 6-10 dramatic SCENE CARDS arranged in chronological order. Each card represents a key moment. Each card has Read aloud for the dialogue, clickable choice buttons, and at least one dramatic decision per player.

CRITICAL INTERACTION RULES:
- Every card MUST have a "🔊 Read aloud" button that calls awRead(text, voice) — the canvas speaks the dialogue using the assigned voice.
- NO automatic TTS loops. Reading must ONLY happen on user click.
- Scene cards must flow cinematically — each card leads to the next via a clear "Next scene" button.
- Each dramatic decision card must have exactly three options, with consequences noted in the next card.
- Every button MUST speak its label aloud when clicked.`,
    defaultRoles: [
      { role: "Director", emoji: "🎬", alignment: "Narrator", brief: "Sets scenes, narrates transitions, controls pacing." },
      { role: "Hero", emoji: "🦸", alignment: "Lead", brief: "Drives the plot, makes key decisions." },
      { role: "Ally", emoji: "🤝", alignment: "Ally", brief: "Supports the hero, gives exposition, rewards." },
      { role: "Antagonist", emoji: "🎭", alignment: "Hostile", brief: "Drives conflict, delivers twists, sets stakes." },
      { role: "Mentor", emoji: "🕯️", alignment: "Wise", brief: "Delivers wisdom, side-quests, lore." },
    ],
    requiredWidgets: [
      { widget: "clues", title: "Plot Clues", purpose: "Track plot reveals and foreshadowing." },
      { widget: "relationship", title: "Relationships", purpose: "Show character alliances and rivalries." },
      { widget: "vote", title: "Audience Vote", purpose: "Let the audience vote on a key decision." },
      { widget: "dossier", title: "Dossier", purpose: "Show character bios and revealed secrets." },
      { widget: "timer", title: "Scene Timer", purpose: "Optional dramatic pause timer." },
    ],
    itemArchetypes: [
      { name: "Mystery Clue", emoji: "🔍", rarity: "rare", purpose: "A revealing piece of evidence." },
      { name: "Old Photograph", emoji: "📷", rarity: "common", purpose: "Flashes back to a memory, adds lore." },
      { name: "Confession Letter", emoji: "✉️", rarity: "epic", purpose: "Reveals a secret, dramatic." },
      { name: "Master Key", emoji: "🗝️", rarity: "legendary", purpose: "Opens the season-finale location." },
      { name: "Encrypted File", emoji: "💾", rarity: "epic", purpose: "Adds a twist when decoded." },
    ],
    soundArchetypes: [
      { key: "epic-theme", search: "epic cinematic theme loop", emoji: "🎼" },
      { key: "tension", search: "cinematic tension suspense", emoji: "🔪" },
      { key: "reveal", search: "mystery reveal sting", emoji: "💡" },
      { key: "sad", search: "sad cinematic piano", emoji: "🥀" },
    ],
    requiredScenes: [
      { title: "Intro", minLines: 8, must: ["title card", "episode number", "stock background", "Play Episode button"] },
      { title: "Cast", minLines: 12, must: ["card per character", "Read aloud button", "How to Watch button"] },
      { title: "How to Watch", minLines: 8, must: ["3-6 rules", "Start Episode button"] },
      { title: "Episode", minLines: 60, must: ["6-10 scene cards", "every card has Read aloud", "decision cards", "twist", "relationship widget", "plot clues widget", "particle system"] },
    ],
    cardPatterns: [
      {
        name: "Scene card",
        description: "Each card is a key dramatic moment with Read aloud dialogue.",
        code: "<article class='aw-scene-card' data-aw='prompt'>...<button class='aw-read' onclick='awRead(...)'>🔊 Read aloud</button></article>",
      },
      {
        name: "Plot clue",
        description: "Discovered clues are added to the dossier widget.",
        code: "<button onclick='awItem(...)'>📷 Photograph found</button>",
      },
      {
        name: "Audience decision",
        description: "Three buttons that branch the story.",
        code: "<div class='aw-decision'><button>Option A</button><button>Option B</button><button>Option C</button></div>",
      },
    ],
    rules: [
      "Use a hidden <div class='aw-opening' hidden>...</div> with the narrator's cold-open.",
      "Every scene card must include a Read aloud button bound to awRead(text, voiceURI).",
      "Embed data-aw=\"item\" triggers for every discovered clue, photo, and prop.",
      "Embed data-aw=\"prompt\" triggers for every dramatic decision.",
      "Embed data-aw=\"widget\" triggers for the dossier, relationship, and clues.",
      "Embed data-aw=\"speak\" triggers for at least 6 lines of dialogue (mix of narrator and cast).",
      "Cinematic typography: large headlines, movie-poster composition, dramatic lighting.",
      "Stock images must be real Unsplash URLs that match the movie/show universe.",
      "Banned: anything that doesn't feel like a real show. No placeholders, no lorem ipsum.",
    ],
  },

  {
    id: "situational",
    label: "Situational / Educational",
    icon: "🌍",
    blurb: "Real-life scenario training. The AI builds a hyper-realistic situation with vocabulary cards, scenario dialog, and read-aloud lessons.",
    system: `TEMPLATE: SITUATIONAL / EDUCATIONAL

You are generating a turn-based, real-life situational training. The output must look, feel, and behave like a hyper-realistic educational browser scene, structured around SITUATION CARDS that the player clicks to advance and read aloud.

REQUIRED SCENE STRUCTURE:
1. INTRO — Title card, learning objective, narrator's opening. Button "▶ Begin Lesson".
2. CAST — Character cards (player, NPCs like waiter/doctor/etc.). Each card has a "🔊 Read aloud" button. Button "▶ How it Works".
3. HOW IT WORKS — Three to six rules describing the scenario: read each situation card aloud → choose a response → learn vocabulary → unlock the next step. Button "▶ Start Scenario".
4. SCENARIO — 6-10 situation cards (e.g. ordering at a restaurant, asking for directions, visiting a doctor). Each card shows context in the L1 language, has a 🔊 Read aloud button, presents a multiple-choice response, and a vocabulary hint with the key phrase in L1 and a CEFR-level English translation.

CRITICAL INTERACTION RULES:
- Every card MUST have a "🔊 Read aloud" button that calls awRead(text, voice) — the canvas speaks the phrase using the assigned voice.
- NO automatic TTS loops. Reading must ONLY happen on user click.
- For each NPC line, you MUST also expose a CEFR-strict English translation card with its own Read aloud button.
- Every vocabulary word MUST have a Read aloud button (calls awRead for the L1 word and the English translation separately).
- Every response choice card MUST have its own Read aloud button.
- All learner-facing text MUST be at the player's CEFR level (very simple A1, or whatever the player's CEFR is).`,
    defaultRoles: [
      { role: "Tutor", emoji: "🧑‍🏫", alignment: "Guide", brief: "Walks the player through each situation, gives translations, scores responses." },
      { role: "Native Speaker", emoji: "🗣️", alignment: "NPC", brief: "Speaks in L1 with realistic pace, then a CEFR English translation card." },
      { role: "Helper NPC", emoji: "🤝", alignment: "Ally", brief: "Reassures the player, offers hints, encourages retry." },
    ],
    requiredWidgets: [
      { widget: "language", title: "Language Lesson", purpose: "Show key vocabulary with L1 + CEFR translation, each Read aloud." },
      { widget: "clues", title: "Conversation Hints", purpose: "Show useful phrases for each situation." },
      { widget: "questlog", title: "Learning Progress", purpose: "Track which situations the player has completed." },
      { widget: "relationship", title: "Conversation Partner", purpose: "Show the NPC relationship and progress." },
    ],
    itemArchetypes: [
      { name: "Vocabulary Phrase", emoji: "💬", rarity: "common", purpose: "A useful phrase in L1, with CEFR English translation." },
      { name: "Grammar Note", emoji: "📝", rarity: "rare", purpose: "A short grammar tip tied to the current scenario." },
      { name: "Cultural Tip", emoji: "🌐", rarity: "epic", purpose: "A cultural do/don't relevant to the situation." },
      { name: "Achievement Stamp", emoji: "🏅", rarity: "legendary", purpose: "Awarded when the player completes a scenario." },
    ],
    soundArchetypes: [
      { key: "cafe", search: "cafe restaurant ambient", emoji: "☕" },
      { key: "street", search: "city street ambient", emoji: "🚶" },
      { key: "success", search: "positive ding success", emoji: "🎯" },
    ],
    requiredScenes: [
      { title: "Intro", minLines: 8, must: ["title card", "learning objective", "Begin Lesson button"] },
      { title: "Cast", minLines: 12, must: ["card per character", "Read aloud button", "How it Works button"] },
      { title: "How it Works", minLines: 8, must: ["3-6 rules", "Start Scenario button"] },
      { title: "Scenario", minLines: 60, must: ["6-10 situation cards", "L1 + English translation", "every card has Read aloud", "vocabulary widget", "3 decision cards", "particle system"] },
    ],
    cardPatterns: [
      {
        name: "Situation card",
        description: "Context in L1, three response choices, each Read aloud.",
        code: "<article class='aw-scene-card'><p data-lang='L1'>...</p><button class='aw-read' onclick='awRead(text, voice)'>🔊 L1</button><button class='aw-read' onclick='awRead(en, voice)'>🔊 English</button><div class='aw-decision'><button>Yes</button><button>No</button><button>Maybe</button></div></article>",
      },
      {
        name: "Vocabulary card",
        description: "Single word/phrase with both languages and a Read aloud button.",
        code: "<div class='aw-vocab'><span class='aw-l1'>Bonjour</span><span class='aw-en'>Hello</span><button onclick='awRead(...)'>🔊</button></div>",
      },
    ],
    rules: [
      "Use a hidden <div class='aw-opening' hidden>...</div> with the narrator's opening line.",
      "Every situation card, vocabulary card, and decision card must have its own Read aloud button bound to awRead(text, voiceURI).",
      "All learner-facing text MUST be at the player's CEFR level (very simple at A1/A2).",
      "Every L1 line MUST be paired with a CEFR-strict English translation, each with its own Read aloud.",
      "Embed data-aw=\"speak\" triggers for the L1 line AND the translation.",
      "Embed data-aw=\"prompt\" triggers for the response decision cards.",
      "Embed data-aw=\"widget\" triggers for the language widget, vocabulary bank, and progress log.",
      "Stock images must be real Unsplash URLs that match the situational context (cafe, airport, hospital, etc.).",
      "Banned: placeholders, lorem ipsum, abstract gradient screens, English-only teaching.",
    ],
  },

  {
    id: "social-deduction",
    label: "Social Deduction (deep)",
    icon: "🕵️",
    blurb: "Full hidden-role social deduction with strict turn-based phases, votes, and round-based gameplay.",
    system: `TEMPLATE: SOCIAL DEDUCTION (HIDDEN ROLES)

You are generating a complete, playable social-deduction round. The output must look, feel, and behave like a hyper-realistic social-deduction game (Mafia/Werewolf/Avalon style) inside the browser, structured around PHASE CARDS that the player clicks to advance and read aloud.

REQUIRED SCENE STRUCTURE:
1. INTRO — Game title, narrator's opening ("The night falls over the village..."). Button "▶ See Roles".
2. CAST — A card per player/NPC. Each card has a "🔊 Read aloud" button that, when clicked, reveals that player's SECRET ROLE and SECRET GOAL. NEVER reveal secret roles in the public narration. The card can be flipped individually to read its role aloud. Button "▶ How to Play".
3. HOW TO PLAY — Three to six rules describing the day/night cycle, voting, and elimination. Button "▶ Start Round".
4. ROUND — Hyper-realistic environment with PHASE CARDS:
   - Day Discussion card: shows a list of suspect cards, each clickable to read aloud that player's defense/accusation.
   - Vote card: each player has a Vote button (records their vote into a tally visible on the screen).
   - Night Phase card: NPCs speak to each other via private cards (only the relevant role can flip and read aloud).
   - Reveal card: the GM sees the round outcome and the next step.

CRITICAL INTERACTION RULES:
- Every card MUST have a "🔊 Read aloud" button that calls awRead(text, voice) — the canvas speaks using the assigned voice.
- NO automatic TTS loops. Reading must ONLY happen on user click.
- Secret roles are HIDDEN by default. Each role card flips individually when its owner clicks the card. NEVER expose secret roles in the public narration.
- The day-discussion card lists all alive players; clicking a player card shows that player's public defense and lets the audience read it aloud.
- The vote card has a Vote button for each player. Tallies must be visible.
- The night-phase card has private NPC-to-NPC conversation cards (only readable aloud by the right participants).
- The reveal card shows the round outcome and continues to the next round.`,
    defaultRoles: [
      { role: "Narrator", emoji: "📜", alignment: "Neutral", brief: "Runs day/night, never plays, never has a hidden role." },
      { role: "Detective", emoji: "🕵️", alignment: "Town", brief: "Each night, investigates one player. Public role." },
      { role: "Doctor", emoji: "🩺", alignment: "Town", brief: "Each night, protects one player from elimination." },
      { role: "Godfather", emoji: "🕴️", alignment: "Mafia", brief: "Secretly leads the Mafia. Looks innocent publicly." },
      { role: "Mafia", emoji: "🔪", alignment: "Mafia", brief: "Secretly eliminates a Town player each night." },
      { role: "Townsperson", emoji: "🏘️", alignment: "Town", brief: "No powers. Must vote out Mafia through social reads." },
    ],
    requiredWidgets: [
      { widget: "vote", title: "Vote Tally", purpose: "Live count of votes per player." },
      { widget: "relationship", title: "Allegiances", purpose: "Show hidden allegiances (only when relevant)." },
      { widget: "clues", title: "Public Clues", purpose: "Track what each player has said in public." },
      { widget: "timer", title: "Day Timer", purpose: "Time limit for discussion." },
      { widget: "dossier", title: "Dossier", purpose: "Public info on each alive player." },
    ],
    itemArchetypes: [
      { name: "Public Alibi", emoji: "📃", rarity: "common", purpose: "A statement each player makes publicly." },
      { name: "Vote Token", emoji: "🗳️", rarity: "common", purpose: "Marks a player's vote." },
      { name: "Role Card (Secret)", emoji: "🎴", rarity: "legendary", purpose: "Reveals a player's role only to themselves." },
    ],
    soundArchetypes: [
      { key: "night", search: "ominous night ambient", emoji: "🌙" },
      { key: "day", search: "calm village ambient", emoji: "🌅" },
      { key: "suspense", search: "suspense reveal sting", emoji: "⚖️" },
    ],
    requiredScenes: [
      { title: "Intro", minLines: 8, must: ["title card", "narrator opening", "See Roles button"] },
      { title: "Cast", minLines: 14, must: ["card per character with a flip-to-reveal role button", "Read aloud button on every card", "How to Play button"] },
      { title: "How to Play", minLines: 10, must: ["3-6 rules", "Start Round button"] },
      { title: "Round", minLines: 70, must: ["Day discussion card", "Vote card with Vote buttons", "Night card with private NPC conversations", "Reveal card", "vote tally widget", "Read aloud on every card", "particle system"] },
    ],
    cardPatterns: [
      {
        name: "Secret role card",
        description: "Default hidden, flips on click to reveal the role and reads aloud.",
        code: "<article class='aw-role-card aw-hidden' data-role='Detective'><div class='aw-back'>Tap to read aloud your role</div><div class='aw-front'>Detective: investigate one player each night</div><button onclick='awRead(text, voice)'>🔊 Read aloud</button></article>",
      },
      {
        name: "Vote card",
        description: "Each player has a Vote button that updates the tally.",
        code: "<div class='aw-vote-card'><button onclick='awVote(playerId)'>Vote against {name}</button><div class='aw-tally'>Player A: 0 — Player B: 0</div></div>",
      },
      {
        name: "Public speech card",
        description: "Each player's public statement is a card with Read aloud.",
        code: "<article class='aw-speech'><p>{statement}</p><button onclick='awRead(text, voice)'>🔊 Read aloud</button></article>",
      },
    ],
    rules: [
      "Use a hidden <div class='aw-opening' hidden>...</div> with the narrator's cold-open.",
      "Never reveal any player's secret role in the public narration or in any public card.",
      "Each role card has a flip interaction and a Read aloud button bound to awRead(text, voiceURI).",
      "Each day's discussion card lists all alive players. Each player has a public speech card with Read aloud.",
      "The vote card has a Vote button for each alive player; the tally updates visually.",
      "The night card has private NPC-to-NPC conversation cards, only readable aloud by the relevant participants.",
      "Embed data-aw=\"widget\" triggers for the vote tally, relationship, dossier, clues, and timer.",
      "Embed data-aw=\"speak\" triggers for the narrator's day/night transitions.",
      "Banned: any public reveal of a secret role. The reveal card must show ONLY the round outcome, never the roles of eliminated players.",
    ],
  },

  {
    id: "custom",
    label: "Custom / Open",
    icon: "✨",
    blurb: "Freeform hyper-realistic canvas with cards, items, and a Read-aloud on every card.",
    system: `TEMPLATE: CUSTOM / OPEN SCENE

You are generating a hyper-realistic interactive scene. Use any visual style, any layout, any atmosphere. The output is structured around CARDS that the player clicks to advance and read aloud.

REQUIRED SCENE STRUCTURE:
1. INTRO — Cinematic title card. Narrator's opening line. Big "▶ Begin".
2. CAST — Character cards (one per player and NPC), each with a "🔊 Read aloud" button. Big "▶ How to Play".
3. HOW TO PLAY — Three to six rules describing how the player advances through the scene. Big "▶ Start".
4. SCENE — Hyper-realistic environment. Card grid of 6-12 interactive cards. Every card has a Read aloud button. Includes at least one decision card and at least one item pickup.

CRITICAL INTERACTION RULES:
- Every card MUST have a "🔊 Read aloud" button that calls awRead(text, voice) — the canvas speaks using the assigned voice.
- NO automatic TTS loops. Reading must ONLY happen on user click.
- Every item pickup card adds the item to the inventory widget.
- Every decision card has exactly three options.
- Every button MUST speak its label aloud when clicked.`,
    defaultRoles: [
      { role: "Narrator", emoji: "📜", alignment: "Guide", brief: "Sets context, narrates transitions." },
      { role: "Ally", emoji: "🤝", alignment: "Ally", brief: "Helps the player, gives hints." },
      { role: "Neutral", emoji: "👤", alignment: "Neutral", brief: "Can become ally or obstacle." },
    ],
    requiredWidgets: [
      { widget: "clues", title: "Clues", purpose: "Track discoveries." },
      { widget: "questlog", title: "Quest Log", purpose: "Show objectives." },
    ],
    itemArchetypes: [
      { name: "Universal Token", emoji: "🔮", rarity: "rare", purpose: "An item the player needs to advance." },
      { name: "Memento", emoji: "🖼️", rarity: "common", purpose: "Adds lore or emotion." },
      { name: "Power Crystal", emoji: "⚡", rarity: "legendary", purpose: "Unlocks a final power." },
    ],
    soundArchetypes: [
      { key: "ambient", search: "atmospheric ambient loop", emoji: "🌫️" },
      { key: "success", search: "success ding", emoji: "🎯" },
    ],
    requiredScenes: [
      { title: "Intro", minLines: 8, must: ["title card", "Begin button"] },
      { title: "Cast", minLines: 10, must: ["card per character", "Read aloud button", "How to Play button"] },
      { title: "How to Play", minLines: 6, must: ["3-6 rules", "Start button"] },
      { title: "Scene", minLines: 50, must: ["6-12 cards", "every card has Read aloud", "decision cards", "inventory widget"] },
    ],
    cardPatterns: [
      {
        name: "Generic card",
        description: "Any card with a Read aloud button.",
        code: "<article class='aw-card'><h3>Title</h3><p>Body</p><button onclick='awRead(text, voice)'>🔊 Read aloud</button></article>",
      },
    ],
    rules: [
      "Use a hidden <div class='aw-opening' hidden>...</div> with the narrator's opening line.",
      "Every card must have a Read aloud button bound to awRead(text, voiceURI).",
      "Every button must speak its label aloud when clicked.",
      "Embed data-aw=\"item\", data-aw=\"prompt\", and data-aw=\"widget\" triggers as appropriate.",
      "Stock images must be real Unsplash URLs that match the universe exactly.",
      "Banned: placeholders, lorem ipsum, abstract gradient screens, mountains/rain/castle defaults.",
    ],
  },
];

export const UNIVERSE_TEMPLATE_MAP: Record<string, UniverseTemplate> = Object.fromEntries(
  UNIVERSE_TEMPLATES.map((t) => [t.id, t]),
);
