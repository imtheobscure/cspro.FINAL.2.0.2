import type { CEFRLevel, GameState, UniverseTemplate } from "./types";
import { UNIVERSE_TEMPLATE_MAP } from "./templates";

const CEFR_GUIDE: Record<CEFRLevel, string> = {
  A1: "very simple words, 4–8 word sentences, present tense, no idioms, basic everyday vocabulary",
  A2: "simple words, 6–12 word sentences, present and past tense, a few common idioms",
  B1: "everyday vocabulary, 8–16 word sentences, common phrasal verbs, simple conditionals",
  B2: "richer vocabulary, 10–20 word sentences, complex tenses, idiomatic phrases used sparingly",
  C1: "advanced vocabulary, nuanced sentences, abstract ideas, idioms, register shifts",
  C2: "literary register, complex syntax, advanced idioms, technical and academic precision",
};

function profileEntity(e: GameState["entities"][number]) {
  const cefr = e.cefrLevel ?? "B1";
  return `- id="${e.id}" | ${e.emoji} ${e.name}${e.role ? ` [role: ${e.role}]` : ""}
    background: ${e.background || "—"}
    personality: ${e.personality || "—"}
    goals: ${e.goals || "—"}
    abilities: ${e.abilities || "—"}
    focused CEFR level: ${cefr} (${CEFR_GUIDE[cefr]})
    native/L1: ${e.nativeLanguage || "not set"} | learning language: ${e.learningLanguage || "English"}
    ${e.kind === "npc" ? "multilingual rule: speak in L1 first, then immediately give a tiny English teaching note at the player's CEFR level." : "this entity is a player, not an NPC — players are listeners, only NPCs can speak."}
    voice: ${e.voiceURI || "default"} | translation voice: ${e.translationVoiceURI || "default"}`;
}

function getActiveTemplate(state: GameState): UniverseTemplate {
  const uni = state.universes.find((u) => u.id === state.activeUniverseId);
  if (uni?.templateId && UNIVERSE_TEMPLATE_MAP[uni.templateId]) {
    return UNIVERSE_TEMPLATE_MAP[uni.templateId];
  }
  // Auto-derive from category for backward compatibility.
  if (uni?.category === "social-deduction") return UNIVERSE_TEMPLATE_MAP["social-deduction"];
  if (uni?.category === "video-game") return UNIVERSE_TEMPLATE_MAP["video-game"];
  if (uni?.category === "movie") return UNIVERSE_TEMPLATE_MAP["movie-tv"];
  if (uni?.category === "situational") return UNIVERSE_TEMPLATE_MAP["situational"];
  return UNIVERSE_TEMPLATE_MAP["custom"];
}

function availableNaturalVoicesForPrompt(): string {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return "(browser voice list unavailable; use the voiceURI values already shown in cast profiles)";
    const blocked = ["david", "zira", "mark", "hazel", "george", "susan", "heera", "ravi", "sean", "default"];
    const good = ["natural", "online", "ava", "aria", "jenny", "guy", "emma", "brian", "ana", "andrew", "christopher", "libby", "ryan", "sonia", "natasha", "william", "neerja", "prabhat"];
    return window.speechSynthesis.getVoices()
      .filter((v) => /^en(-|$)/i.test(v.lang))
      .filter((v) => !blocked.some((b) => v.name.toLowerCase().includes(b)))
      .filter((v) => good.some((g) => v.name.toLowerCase().includes(g)))
      .map((v) => `- ${v.name} | ${v.lang} | voiceURI="${v.voiceURI}"`)
      .slice(0, 40)
      .join("\n") || "(no natural voice list loaded yet; use each entity's existing voiceURI from the profile)";
  } catch {
    return "(browser voice list unavailable; use the voiceURI values already shown in cast profiles)";
  }
}

function renderTemplate(tpl: UniverseTemplate): string {
  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════════════════════════════");
  lines.push(`ACTIVE TEMPLATE: ${tpl.icon} ${tpl.label.toUpperCase()}`);
  lines.push("═══════════════════════════════════════════════════════════════════════════");
  lines.push(tpl.system);
  lines.push("");
  lines.push("Required NPC roles for this template (you MUST populate via data-aw=\"suggest-npc\"):");
  tpl.defaultRoles.forEach((r) => {
    lines.push(`  • ${r.emoji} ${r.role} (${r.alignment}) — ${r.brief}`);
  });
  lines.push("");
  lines.push("Required widgets (you MUST emit data-aw=\"widget\" for each):");
  tpl.requiredWidgets.forEach((w) => {
    lines.push(`  • widget="${w.widget}" title="${w.title}" — ${w.purpose}`);
  });
  lines.push("");
  lines.push("Item archetypes you may use (you may also invent new ones themed to the universe):");
  tpl.itemArchetypes.forEach((i) => {
    lines.push(`  • ${i.emoji} ${i.name} (${i.rarity}) — ${i.purpose}`);
  });
  lines.push("");
  lines.push("Sound archetypes (use real royalty-free audio URLs in <audio> tags):");
  tpl.soundArchetypes.forEach((s) => {
    lines.push(`  • ${s.emoji} ${s.key} — search phrase: "${s.search}"`);
  });
  lines.push("");
  lines.push("Required scenes (each with strict requirements):");
  tpl.requiredScenes.forEach((s) => {
    lines.push(`  • ${s.title} — minimum ${s.minLines} lines, MUST include: ${s.must.join(", ")}`);
  });
  lines.push("");
  lines.push("Card patterns you MUST implement (these are exact patterns the canvas recognises):");
  tpl.cardPatterns.forEach((p) => {
    lines.push(`  • ${p.name} — ${p.description}`);
    lines.push(`    Code: ${p.code}`);
  });
  lines.push("");
  lines.push("FUNCTIONAL RULES (non-negotiable):");
  tpl.rules.forEach((r) => lines.push(`  • ${r}`));
  return lines.join("\n");
}

export function buildScenePrompt(s: GameState): string {
  const uni = s.universes.find((u) => u.id === s.activeUniverseId);
  const players = s.entities.filter((e) => e.kind === "player");
  const npcs = s.entities.filter((e) => e.kind === "npc");
  const tpl = getActiveTemplate(s);
  const globalCefr = s.settings.cefrLevel;
  const perPlayerCefr =
    players.map((p) => `${p.name}: ${p.cefrLevel ?? globalCefr}`).join(", ") || "—";
  const voiceList = availableNaturalVoicesForPrompt();

  return `You are TUTORLY STORY MAKER HYPER-ENGINE. You output ONE self-contained HTML fragment that becomes a playable, hyper-realistic card-based game on a live screen-shared canvas.

RETURN ONLY ONE HTML FRAGMENT. No markdown fences. No prose. No placeholders. No "lorem ipsum". No TODO.

═══════════════════════════════════════════════════════════════════════════
SECTION 1 — ACTIVE GENERATION TEMPLATE (HARD-CONSTRAINED)
═══════════════════════════════════════════════════════════════════════════

${renderTemplate(tpl)}

═══════════════════════════════════════════════════════════════════════════
SECTION 2 — INTERACTION CONTRACT (HOW BUTTONS ACTUALLY WORK)
═══════════════════════════════════════════════════════════════════════════

The canvas auto-defines these GLOBAL JavaScript functions inside the iframe. Call them from your buttons. They communicate with the host app, so they 100% integrate with the leaderboard:

  awRead(text, voiceURI)         → speaks the text aloud (host forces a natural voice; never robotic David). NO LOOPS — only on click.
  awItem(emoji, name, rarity)    → adds the item to the SELECTED player on the leaderboard (rarity: common|rare|epic|legendary).
  awStat(key, op, val, targetId) → changes a stat. If targetId is omitted, it affects the SELECTED player. If targetId is supplied, it can affect an NPC or any entity. key: health|hunger|thirst|score|lives|deaths. op: 'add'|'set'.
  awPowerup(name)                → grants a power-up to the SELECTED player.
  awStatus(emoji, label, turns)  → applies a status effect to the SELECTED player.
  awDecision(actionText)         → records the SELECTED player's decision.
  awGoPhase('intro'|'cast'|'howto'|'game')   → switches phase.
  awVote(targetName, tallyElId)  → increments a local vote tally.
  awTimer(seconds, elId)         → runs a countdown into element #elId.

THE SELECTED PLAYER: the GM clicks a player on the leaderboard to "select" them. Item pickups, stat changes, and decisions made by clicking buttons are applied to that selected player. So every interactive button affects whoever is selected. Design buttons accordingly (e.g. "Pick up the Gun", "Drink the potion", "Open the door").

TWO WAYS TO WIRE A BUTTON (use either, both work):

  (A) Inline call:
    <button onclick="awItem('🔫','Pistol','rare'); awComplete(this)">Pick up the Pistol</button>
    <button onclick="awStat('health','add',-15); awComplete(this)">Touch the cursed idol (−15 HP)</button>
    <button onclick="awStat('health','add',-20,'NPCID_HERE'); awComplete(this)">Attack the guard (NPC −20 HP)</button>
    <button onclick="awStat('score','add',25); awItem('🗝️','Iron Key','rare'); awComplete(this)">Solve the riddle</button>

  (B) Data attributes (the canvas auto-handles the click):
    <button data-aw-give-item data-emoji="🔫" data-name="Pistol" data-rarity="rare">Pick up the Pistol</button>
    <button data-aw-stat data-key="health" data-op="add" data-val="-15">Touch the cursed idol</button>
    <button class="aw-read" data-text="..." data-voice="...">🔊 Read aloud</button>

CONSEQUENCES & STATE: every interactive card should have a believable consequence — picking up an item, gaining/losing HP, getting hungrier (awStat('hunger','add',10)), scoring points, or changing an NPC relationship. After an action, mark the card finished: call awComplete(this) OR add class="aw-used" to the card, OR reveal the next card with data-aw-reveal="idOfNextCard". This makes the board feel alive and turn-based.

DO NOT build a separate inventory panel/widget — items automatically appear on the player in the leaderboard via awItem. Never duplicate the inventory inside the scene.

AMBIENT SOUND: to play looping background sound, include exactly one
  <audio data-aw-ambient src="https://.../ambient-loop.mp3"></audio>
The host plays it automatically (autoplay-safe). Use a real royalty-free URL. For short click SFX you may use a normal <audio> and .play() inside a click handler.

TIMERS: if a scene has a countdown, render <span id="roundTimer"></span> and call awTimer(30,'roundTimer') from a button or on phase start. It runs in the iframe and updates live.

ABSOLUTELY NO AUTOMATIC TTS LOOPS. Speech is ONLY triggered by a click.

═══════════════════════════════════════════════════════════════════════════
SECTION 2B — NATURAL VOICE CASTING (MANDATORY)
═══════════════════════════════════════════════════════════════════════════

Every character must have a unique, character-appropriate voice. Do NOT use Microsoft David, Zira, Mark, Hazel, George, Susan, or any robotic/Desktop/default voice. Use ONLY natural/online English voices (US, UK, Australian, Canadian, Indian, Irish, New Zealand, etc.) or the exact voiceURI already listed in the character profile.

Available natural voices from this browser session:
${voiceList}

Rules:
- In the cast phase, every character card's Read aloud button must include that character's voiceURI in data-voice.
- In the game phase, every NPC dialogue Read aloud button must use that NPC's unique voiceURI, not the narrator's.
- The narrator uses narrator voice only for narrator cards; do not reuse narrator/Microsoft Ava for every character.
- If an NPC is bilingual, first use the NPC's L1 voice for the original line, then a separate English translator voice for the English/L2 explanation.
- For suggested NPCs, choose a plausible nationality/L1 and include data-nativelanguage and data-learninglanguage. Also add data-voiceuri and data-translationvoiceuri when suggesting NPCs so the app can preserve the choice.
- Meet-the-Cast cards must let each character introduce himself/herself with their own voice, not the narrator.

═══════════════════════════════════════════════════════════════════════════
SECTION 3 — REQUIRED HTML SKELETON (EMBED VERBATIM)
═══════════════════════════════════════════════════════════════════════════

Place this inside the chapter root, then fill in each phase. Only the "game" phase MUST be fully built; the others can be compact but functional.

<section class="aw-scene" data-aw-scene-title="${tpl.label}">
  <!-- ====== INTRO ====== -->
  <section data-aw-phase="intro" class="aw-phase aw-phase-intro">
    <h1 class="aw-title">{Universe Name}</h1>
    <p class="aw-tagline">{One short evocative line}</p>
    <div class="aw-opening" hidden>One short sentence the narrator will read.</div>
    <button class="aw-read" data-text="..." data-voice="...">🔊 Read aloud</button>
    <button onclick="awGoPhase('cast')">▶ Next: See Cast</button>
  </section>

  <!-- ====== CAST ====== -->
  <section data-aw-phase="cast" class="aw-phase aw-phase-cast" style="display:none">
    <h2>Meet the Cast</h2>
    <div class="aw-cast-grid">
      <!-- One card per player and per NPC. Each has a Read aloud button. -->
      <article class="aw-cast-card" data-entity-id="...">
        <div class="aw-emoji">{emoji}</div>
        <h3>{name}</h3>
        <p class="aw-role">{role}</p>
        <p class="aw-bio">{bio}</p>
        <button class="aw-read" data-text="..." data-voice="...">🔊 Read aloud</button>
      </article>
      <!-- repeat per player/NPC -->
    </div>
    <button onclick="awGoPhase('howto')">▶ Next: How to Play</button>
  </section>

  <!-- ====== HOW TO PLAY ====== -->
  <section data-aw-phase="howto" class="aw-phase aw-phase-howto" style="display:none">
    <h2>How to Play</h2>
    <ol>
      <li>Read each card aloud by clicking 🔊 Read aloud</li>
      <li>...</li>
    </ol>
    <button onclick="awGoPhase('game')">▶ Start the Game</button>
  </section>

  <!-- ====== GAME (the actual game) ====== -->
  <section data-aw-phase="game" class="aw-phase aw-phase-game" style="display:none">
    <!-- Hyper-realistic environment. Use real stock images. Use ambient particles. -->
    <div class="aw-game-grid">
      <!-- 6-12+ interactive cards. Each card has a Read aloud button. -->
    </div>
    <button class="aw-read" data-text="..." data-voice="...">🔊 Read aloud (game intro)</button>
  </section>
</section>

<script>
  function awGoPhase(p){
    document.querySelectorAll('[data-aw-phase]').forEach(function(s){
      s.style.display = (s.getAttribute('data-aw-phase') === p) ? '' : 'none';
    });
    try { window.scrollTo({top:0, behavior:'smooth'}); } catch(e){}
  }
  document.addEventListener('DOMContentLoaded', function(){
    if (typeof awGoPhase === 'function') awGoPhase('intro');
  });
</script>

═══════════════════════════════════════════════════════════════════════════
SECTION 4 — CANVAS TRIGGER CONTRACT
═══════════════════════════════════════════════════════════════════════════

These run ONCE at deploy time (initial state). Place them inside a hidden <div class="aw-triggers" hidden>...</div> block. For LIVE interactivity during play, use the SECTION 2 functions (awItem, awStat, …) on buttons instead.

- <i data-aw="speak" data-id="narrator|NPCID" data-kind="line|translation" data-text="..."></i>   (records the opening dialogue lines)
- <i data-aw="prompt" data-id="PLAYERID" data-hint1="..." data-hint2="..." data-hint3="..."></i>   (one per player — drives the decision panel)
- <i data-aw="relation" data-from="NPCID" data-to="PLAYERID" data-op="add" data-val="NUMBER"></i>
- <i data-aw="suggest-npc" data-name="..." data-emoji="..." data-role="..." data-background="..." data-goals="..." data-personality="..." data-abilities="..." data-nativelanguage="..." data-learninglanguage="..."></i>

Items and stat changes are best done through SECTION 2 buttons (awItem/awStat) so they apply to the SELECTED player live. Items always appear on the player in the leaderboard — never build a separate inventory widget.

DO NOT emit any data-aw="weather" — the environment is controlled only by the GM. Keep the scene clear.

Always include a hidden <div class="aw-opening" hidden>One short evocative sentence.</div>.

═══════════════════════════════════════════════════════════════════════════
SECTION 5 — CEFR PER PLAYER (STRICT)
═══════════════════════════════════════════════════════════════════════════

Global default: ${globalCefr} (${CEFR_GUIDE[globalCefr]})
Per-player levels: ${perPlayerCefr}

Every line spoken to a specific player must match that player's CEFR exactly. Group lines use the lowest level present.

═══════════════════════════════════════════════════════════════════════════
SECTION 6 — WORLD AND CAST CONTEXT
═══════════════════════════════════════════════════════════════════════════

Universe: ${uni?.name ?? "Custom"} | Category: ${uni?.category ?? "custom"} | Tone: ${s.settings.tone}
Description: ${uni?.description ?? ""}
Lore: ${uni?.lore ?? ""}

Players (use these exact ids; players are LISTENERS, not speakers):
${players.map(profileEntity).join("\n")}

Existing NPCs (use these exact ids; only NPCs can speak):
${npcs.map(profileEntity).join("\n") || "(none — propose 3–6 via data-aw=\"suggest-npc\")"}

═══════════════════════════════════════════════════════════════════════════
SECTION 7 — TECHNICAL STANDARDS
═══════════════════════════════════════════════════════════════════════════

- Real Unsplash images only (https://images.unsplash.com/photo-...). Match the universe exactly.
- Scoped CSS under .aw-scene, .aw-phase-*, .aw-card, or your own BEM class names.
- Defensive JS wrapped in DOMContentLoaded; guard nulls; never throw.
- No external JS frameworks. No remote libraries. No large base64.
- Valid HTML: balanced tags, quoted attributes. Mentally validate before returning.
- Every clickable surface MUST be reachable by keyboard (use <button>, not <div onclick>).

═══════════════════════════════════════════════════════════════════════════
SECTION 8 — BANNED DEFAULTS
═══════════════════════════════════════════════════════════════════════════

- No mountains, no generic rain, no empty castles, no abstract gradient screens.
- No placeholders, no lorem ipsum, no TODO, no FIXME, no "coming soon".
- No automatic TTS loops. NO auto-reading on page load.
- No HTML element should be empty or whitespace-only.

Return ONLY the HTML fragment. Make it breathtaking, stable, and playable.`;
}

export function buildContinuationPrompt(s: GameState): string {
  const lines: string[] = [];
  const cur = s.chapters.find((c) => c.id === s.activeChapterId);
  const live = cur?.decisions ?? s.liveInputs;
  const globalCefr = s.settings.cefrLevel;
  const tpl = getActiveTemplate(s);

  lines.push("CONTINUE the story with ONE single HTML fragment that is the NEXT BEAT of the current game.");
  lines.push("");
  lines.push(`Active template: ${tpl.icon} ${tpl.label.toUpperCase()}. Same rules. Same structure. Same card-based interactions.`);
  lines.push("Produce a single <section data-aw-phase=\"game\"> with the next set of cards. Keep the same Read aloud pattern.");
  lines.push("Every card MUST have a 🔊 Read aloud button bound to awRead(text, voiceURI). NO automatic TTS loops.");
  lines.push("Keep the look and gadgets stable. Only dynamic state changes.");
  lines.push("");
  lines.push(`Strict CEFR per player. Global default: ${globalCefr}. Per player: ${s.entities.filter((e) => e.kind === "player").map((p) => `${p.name}=${p.cefrLevel ?? globalCefr}`).join(", ") || "—"}.`);
  lines.push("Embed triggers for stat changes, item gains, NPC dialogue (L1 + translation), decisions, widgets, weather, and relationships so the canvas updates immediately.");
  lines.push("");
  lines.push("══════════ CURRENT CAST & INVENTORY ══════════");
  s.entities.forEach((e) => {
    const inv = e.inventory.length > 0
      ? ` | inventory: ${e.inventory.map((i) => `${i.emoji} ${i.name}×${i.qty}`).join(", ")}`
      : "";
    const stats = ` | HP=${e.health}/${e.maxHealth} score=${e.score} hunger=${e.hunger} thirst=${e.thirst}`;
    lines.push(`  • ${e.name} (${e.kind})${e.role ? ` role=${e.role}` : ""}${stats}${inv} | CEFR=${e.cefrLevel ?? globalCefr}`);
  });
  lines.push("");
  lines.push("Characters may BARTER, TRADE, USE, or EXCHANGE their inventory items. A healing potion restores HP. Food reduces hunger. Water reduces thirst. Weapons can be used in combat. Keys open locked areas. Items can be given to NPCs for favors or traded between players.");
  lines.push("══════════ STORY SO FAR ══════════");
  s.chapters.forEach((c, i) => {
    lines.push(`Chapter ${i + 1}: ${c.title} — "${c.narratorOpening}"`);
    c.decisions.forEach((d) => {
      const e = s.entities.find((x) => x.id === d.entityId);
      lines.push(`  • ${e?.name ?? d.entityId} chose: "${d.action}" — reason: "${d.reasoning}"`);
    });
  });
  lines.push("");
  lines.push("══════════ THIS TURN'S ACTIONS (all decisions, in order) ══════════");
  if (live.length === 0) {
    lines.push("  (No decisions locked — advance organically from the previous scene.)");
  } else {
    live.forEach((d, i) => {
      const e = s.entities.find((x) => x.id === d.entityId);
      lines.push(`  ${i + 1}. ${e?.name ?? d.entityId}: "${d.action}" (because: ${d.reasoning || "—"})`);
    });
  }
  lines.push("");
  lines.push("Resolve ALL these actions dramatically, advance fates, update stats/items/relationships via triggers, and present the NEXT beat with new decision prompts and a fresh twist.");
  lines.push("Characters may BARTER, TRADE, USE, or EXCHANGE their inventory items in this next beat.");
  lines.push("Visual continuity: keep the look and gadgets stable. Only dynamic state changes.");
  lines.push("Return ONLY the HTML fragment. No markdown. No explanations. No TODO. No placeholders.");
  return lines.join("\n");
}

export function ambientSearchPhrase(name: string): string {
  return `free royalty-free ambient ${name} loop sound mp3 download`;
}
