import type { Audit, Plan90, Snapshot, Tutor } from "../types";
import { KNOWLEDGE_BASE } from "../knowledge";
import { PROFILE_RUBRIC } from "../knowledge/rubric";
import { PLATFORM_RULES } from "../knowledge/platformRules";
import { platformBrief, platformOf, tutorPlatforms } from "./platforms";

/**
 * Every AI task in this app is a **copy prompt**: the app assembles the context,
 * you paste it into your own AI, and you paste the JSON answer back.
 *
 * That design is deliberate — no API keys, no server, the app runs entirely offline
 * from a folder on your disk. What it costs is that a prompt has to be *complete*,
 * because you only get one shot at the answer. So each prompt here carries three
 * things:
 *
 *   1. the persona and the standard (a mentor who researches, not a generic assistant),
 *   2. the tutor's real data, pulled from the profile so you never retype it,
 *   3. an exact JSON contract with a filled-in example — the same contract
 *      `lib/normalize.ts` accepts, so a correct answer lands first time and a
 *      slightly different one still lands.
 */

export interface CopyPrompt {
  id: string;
  title: string;
  /** One line telling the mentor what this produces. */
  purpose: string;
  prompt: string;
  /** The JSON shape to expect, shown next to the paste box. */
  schema: string;
}

/* --------------------------------------------------------------- shared ---- */

const VOICE = `
VOICE AND STANDARD
- Warm, encouraging, knowledgeable. American English, active voice, no clichés.
- Never use metaphors like "journey", "path", "adventure", "unlock your potential".
- Be specific and concrete. Every claim must trace back to the data you were given.
- If the data does not support a claim, say so instead of inventing it.
`.trim();

const RESEARCH = `
RESEARCH REQUIREMENT (do this before you write anything)
Search the web and ground your answer in current facts, then list the sources you used:
- reddit.com/r/Preply and reddit.com/r/OnlineESLTeaching for what is working for tutors right now.
- The platform's own help center for current rules, badge criteria and policy changes.
- Your platform's tutor community posts from the last 90 days.
Prefer sources from the last 6 months. If you cannot verify a number, mark it "unverified" rather than guessing.
`.trim();

const JSON_RULE = `
OUTPUT RULES
- Reply with ONE valid JSON object and nothing else. No prose, no markdown fences.
- Include every key from the contract below, even when a value is empty ([] or "").
- Numbers are numbers, not strings: 4.8 is 4.8, not "4.8".
- Dates are ISO: YYYY-MM-DD.
`.trim();

function tutorHeader(tutor: Tutor): string {
  const platform = platformOf(tutor.platformId);
  const all = tutorPlatforms(tutor);
  const lines = [
    `Tutor: ${tutor.name}`,
    // The Latin spelling is what goes on a platform form that cannot accept the original
    // script, so the AI is told both rather than inventing one of its own.
    tutor.latinName && tutor.latinName.toLowerCase() !== tutor.name.toLowerCase()
      ? `Name in Latin letters: ${tutor.latinName} (use this spelling on any form that cannot accept the original script)`
      : "",
    `Platform: ${platform.name}`,
    all.length > 1 ? `Also teaches on: ${all.filter((p) => p.id !== platform.id).map((p) => p.name).join(", ")}` : "",
    `Pipeline phase: ${tutor.phase}`,
    `On your roster since: ${tutor.startedAt || "unknown"}`,
    tutor.country ? `Country: ${tutor.country}` : "",
    tutor.tags.length ? `Tags: ${tutor.tags.join(", ")}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function accountBlock(tutor: Tutor): string {
  const a = tutor.account;
  const scripts = a.videoScripts.map((s, i) => `  Video script ${i + 1}: ${s.plain.slice(0, 400)}`).join("\n");
  return [
    "CURRENT ACCOUNT CONTENT",
    a.headlines.length ? `Headlines:\n${a.headlines.map((h) => `  - ${h}`).join("\n")}` : "Headlines: none yet",
    a.description ? `Description (first 800 characters):\n${a.description.slice(0, 800)}` : "Description: none yet",
    scripts || "Video scripts: none yet",
    `Years of experience: ${a.yearsOfExperience || "unknown"}`,
    `Availability: ${a.availabilityHours || "unknown"} hours per week`,
    `Price: $${a.priceUsd || "unknown"} per hour`,
    a.subjects.length ? `Subjects: ${a.subjects.map((s) => s.name).join(" | ")}` : "Subjects: none yet",
    a.certificates.length ? `Certificates: ${a.certificates.join(", ")}` : "Certificates: none yet",
    a.specialties.length ? `Specialties: ${a.specialties.join(", ")}` : "Specialties: none yet",
  ].join("\n");
}

function performanceBlock(tutor: Tutor, weeks = 8): string {
  const recent = [...tutor.snapshots]
    .sort((a, b) => (a.weekOf < b.weekOf ? -1 : 1))
    .slice(-weeks);
  if (!recent.length) return "PERFORMANCE DATA: none recorded yet — say so in your analysis and set confidence accordingly.";
  const rows = recent.map(
    (s) =>
      `${s.weekOf}: $${s.earningsUsd} · ${s.lessons} lessons · ${s.trials} trials (${s.trialsConverted} converted) · ${s.activeStudents} active · ${s.newStudents} new · rating ${s.rating || "n/a"} · replies in ${s.responseHours || "?"}h${s.cancellations ? ` · ${s.cancellations} cancels` : ""}${s.notes ? ` · note: ${s.notes}` : ""}`,
  );
  return ["PERFORMANCE DATA (most recent last, one line per week)", ...rows].join("\n");
}

function goalBlock(tutor: Tutor): string {
  if (!tutor.goal) return "GOALS: not set yet. Recommend concrete targets in your answer.";
  const g = tutor.goal;
  return [
    "GOALS",
    `Monthly income target: $${g.monthlyIncomeUsd} · hours per week: ${g.hoursPerWeek} · students target: ${g.studentsTarget}`,
    g.studentTypes.length ? `Wants to teach: ${g.studentTypes.join(", ")}` : "",
    g.lifeGoal ? `Saving for: ${g.lifeGoal} ($${g.lifeGoalCostUsd})` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function commsBlock(tutor: Tutor, limit = 6): string {
  const recent = [...tutor.logs].sort((a, b) => (a.at < b.at ? -1 : 1)).slice(-limit);
  if (!recent.length) return "COMMUNICATION HISTORY: none logged yet.";
  return [
    "COMMUNICATION HISTORY (oldest first)",
    ...recent.map((l) => `- ${l.at.slice(0, 10)} [${l.mood}] ${l.summary || l.raw.slice(0, 200)}`),
  ].join("\n");
}

const asJson = (value: unknown) => JSON.stringify(value, null, 2);

/* ------------------------------------------------------ 1. roster import -- */

export function rosterImportPrompt(platformList: string[]): CopyPrompt {
  const schema = {
    tutors: [
      {
        name: "علیرضا ابتهاج",
        latinName: "Alireza Ebtehaj",
        phone: "+98 912 000 0000",
        country: "Iran",
        startedAt: "2026-02-14",
        platforms: ["preply", "amazingtalker"],
        phase: "active",
        notes: "Teaches IELTS, 3 years experience, wants evening slots",
      },
    ],
  };
  return {
    id: "roster-import",
    title: "Build the roster from a spreadsheet",
    purpose: "Paste this with your Excel/CSV file attached; you get one JSON block that adds every tutor at once.",
    schema: asJson(schema),
    prompt: `
You are the data assistant for a mentor who coaches online English tutors across several teaching platforms.

TASK
I am attaching a spreadsheet (Excel or CSV) listing my tutors. Read every row and return the roster as JSON.

STEPS
1. Ask me for the file if it is not attached yet. Say exactly: "Attach the spreadsheet and I will build your roster."
2. Identify the columns by meaning, not by position. Names may be in Farsi or English.
3. LATIN NAME — this one matters as much as the name itself. Whenever a name is written in Farsi, Arabic, Cyrillic, Greek or any non-Latin script, transliterate it into the standard Latin spelling a native speaker would use, and put THAT in "latinName", leaving the original script untouched in "name". Example: علیرضا ابتهاج becomes "Alireza Ebtehaj"; محمد رضایی becomes "Mohammad Rezaei"; فاطمه becomes "Fatemeh". Rules for the transliteration:
   - Use the common spelling people actually use, not a letter-by-letter mechanical mapping ("Hossein", not "Hosayn"; "Fatemeh", not "Fatemah").
   - Persian و is "v" or "u" depending on the word; Persian ژ is "zh"; ق and غ are both "gh"; خ is "kh"; ث ص س are all "s"; ح ه are "h"; ع is usually dropped or an "a".
   - Keep the given name and the family name in the same order as the original, capitalised as Western names (First Last), each with only its first letter capitalised.
   - Drop the Persian characters ط and ء or render them as "t" and "" — never as Latin letters with accents.
   - If a cell ALREADY gives an English spelling next to the Farsi one, use that cell verbatim as "latinName" instead of transliterating yourself.
   - If the name is already entirely in Latin letters, set "latinName" to the same value as "name".
4. Convert every date to ISO (YYYY-MM-DD). If a cell says "3 months ago", compute the real date.
5. Normalize phone numbers to international format with a + country code and keep them as strings.
6. PLATFORMS — a tutor is often on more than one platform, so return an ARRAY in "platforms", lowercase ids from this list: ${platformList.join(", ")}. A cell reading "Preply + AmazingTalker", "preply/italki" or "Preply, Classgap" must produce ["preply", "amazingtalker"] etc. Put the platform the row seems to lead with first. If none is recognisable, use ["custom"].
7. Infer the phase from the row when the sheet states it: preparing = still gathering documents, waiting = account submitted or under review, active = teaching and paid, passive = account exists but inactive. Use your best judgement, and prefer "waiting" when you truly cannot tell.
8. Never invent a phone number, a date, a country or a platform. Use "" (or [] for platforms) when the sheet does not say. A Latin name is the ONE field you are asked to produce rather than copy — but only because a non-Latin name always has a correct Latin spelling; never guess a name that is not written down.

OUTPUT
Return ONE JSON object exactly like this, with one entry per row:
${asJson(schema)}

${JSON_RULE}
`.trim(),
  };
}

/* -------------------------------------------------- 2. account creation -- */

export function accountCreationPrompt(tutor: Tutor): CopyPrompt {
  const platform = platformOf(tutor.platformId);
  const schema = {
    headlines: ["Headline one", "Headline two", "Headline three"],
    description:
      "1. Introduce Yourself\n_________________________\n…\n\n2. Teaching Experience\n_________________________\n…\n\n3. Motivate Learners\n_________________________\n…",
    videoScripts: [
      { plain: "Full 45–60 second script in plain English.", pronunciation: "Phonetic stress guide for the opening lines." },
      { plain: "A second, different 45–60 second script.", pronunciation: "Phonetic stress guide." },
    ],
    yearsOfExperience: 5,
    subjects: [{ name: "Conversational English", description: "A tailored paragraph for this subject." }],
    proficiencyLevels: ["Beginner", "Intermediate"],
    ageGroups: ["Adults"],
    certificates: ["TEFL"],
    specialties: ["IELTS Preparation"],
    availabilityHours: 30,
    priceUsd: 12,
  };

  return {
    id: "account-creation",
    title: "Create the account content",
    purpose: `Builds the complete ${platform.name} profile: headlines, description, video scripts, subjects and specialties.`,
    schema: asJson(schema),
    prompt: `
${KNOWLEDGE_BASE}

${platformBrief(platform)}

${VOICE}

TASK
You will be given a block of text about one English teacher. Build the complete, top-quality ${platform.name} profile content.

CRITICAL RULES
1. ABSOLUTE ACCURACY: do not invent skills, subjects, specializations or proficiency levels that the source text does not support. The output must be faithful to what you were given.
2. LENGTH COMES FROM SOFT SKILLS: when you need to write more, elaborate on teaching style, methodology, patience and classroom atmosphere. Never add hard skills that were not stated.
3. NO METAPHORS.
4. ANONYMITY: keep the tutor's name, country of origin and native language out of the description and the video scripts. Open with a neutral greeting.
5. NO PREFIXES: headlines are plain text, with no "Option 1:" labels.
6. VIDEO SCRIPTS ARE MANDATORY. You must always return the "videoScripts" array with exactly two objects, each carrying BOTH keys "plain" and "pronunciation" as strings. An empty array or an empty string fails the task. The "plain" script must be 45–60 seconds when read aloud (about 110–160 words) and must be different between the two options.

OUTPUT CONTRACT
1. headlines: THREE unique, student-focused headlines, 50–75 characters each.
2. description: one long, keyword-rich description (at least 200 words) in exactly this shape inside a single string:
   1. Introduce Yourself
   _________________________
   [content]
   2. Teaching Experience
   _________________________
   [content]
   3. Motivate Learners
   _________________________
   [content]
3. videoScripts: TWO unique 45–60 second scripts. For each, a "plain" version and a "pronunciation" version with stress marked, for example "I am a pro-FESS-ion-al TUT-or".
4. yearsOfExperience: a number.
5. subjects: every subject this tutor can genuinely teach, each with its own concrete paragraph written for THAT subject.
6. proficiencyLevels and ageGroups: only what the text supports.
7. certificates and specialties: list them; leave an empty array when the text mentions none.
8. availabilityHours: a realistic weekly number for ${platform.name}.
9. priceUsd: a starting hourly rate consistent with the tutor's experience and market.

${platform.name.toUpperCase()} ACCOUNT FIELDS THIS MUST SATISFY
${platform.accountFields.map((f) => `- ${f}`).join("\n")}

${tutorHeader(tutor)}

SOURCE MATERIAL TO ANALYZE
---
${tutor.sourceText || "(no source material recorded yet — ask me for it before producing content)"}
---

Return the JSON now, following the contract exactly. Every key must be present.
${asJson(schema)}

${JSON_RULE}
`.trim(),
  };
}

/* ------------------------------------------------------- 3. master audit -- */

export function masterAuditPrompt(tutor: Tutor): CopyPrompt {
  const platform = platformOf(tutor.platformId);
  const schema = {
    powerScore: 72,
    successProbability: 58,
    subScores: [
      { key: "photo", label: "Profile photo", score: 80, weight: 1, tip: "One concrete improvement." },
      { key: "video", label: "Intro video", score: 45, weight: 1.5, tip: "One concrete improvement." },
      { key: "description", label: "Description", score: 70, weight: 1.5, tip: "…" },
      { key: "availability", label: "Availability", score: 60, weight: 1, tip: "…" },
      { key: "pricing", label: "Pricing", score: 55, weight: 1, tip: "…" },
      { key: "certificates", label: "Certificates", score: 90, weight: 0.5, tip: "…" },
      { key: "specialties", label: "Specialties", score: 65, weight: 1, tip: "…" },
      { key: "reviews", label: "Reviews and ratings", score: 50, weight: 1.5, tip: "…" },
      { key: "response", label: "Response time", score: 40, weight: 1.5, tip: "…" },
    ],
    strengths: ["…", "…"],
    weaknesses: ["…", "…"],
    actions: [
      { title: "Short imperative action", why: "Why this moves bookings, with the number behind it.", how: "Exactly what to do this week.", impact: "High" },
      { title: "…", why: "…", how: "…", impact: "Medium" },
      { title: "…", why: "…", how: "…", impact: "Medium" },
    ],
    superTutor: [
      { criterion: "Lessons taught", met: true, value: "46", target: "40+" },
      { criterion: "Rating", met: false, value: "4.6", target: "4.8+" },
      { criterion: "Absences", met: true, value: "0", target: "0" },
      { criterion: "Trial to subscription", met: true, value: "62%", target: "50%+" },
      { criterion: "Trial cancellations", met: true, value: "3%", target: "≤5%" },
      { criterion: "Lesson cancellations", met: true, value: "8%", target: "≤20%" },
      { criterion: "New messages answered in 24h", met: false, value: "55%", target: "80%+" },
      { criterion: "Trials taught in the classroom", met: true, value: "100%", target: "80%+" },
      { criterion: "Follow-up after the trial", met: false, value: "40%", target: "80%+" },
    ],
    summary: "Three or four sentences: where this tutor stands and what changes the outcome first.",
    sources: [{ title: "Source name", url: "https://…" }],
  };

  return {
    id: "master-audit",
    title: "Master AI · Profile Auditor & Scoring Engine",
    purpose: `Scores the whole profile out of 100, predicts booking success, and ranks the three actions that matter most.`,
    schema: asJson(schema),
    prompt: `
You are the Profile Auditor for a mentor who manages online English tutors. You are blunt, specific and data-driven, and you never flatter.

${RESEARCH}

${platformBrief(platform)}

TASK
Audit this tutor's ${platform.name} profile end to end and score it.

SCORING MODEL
- Profile Power Score: 0–100, the weighted average of the sub-criteria below. Use these weights unless the platform clearly does not care about one: photo 1.0, video 1.5, description 1.5, availability 1.0, pricing 1.0, certificates 0.5, specialties 1.0, reviews 1.5, response time 1.5.
- Anchor every sub-score to the platform rubric below, not to your general impression. Where the rubric gives a threshold, the sub-score must follow it: Exceeds expectations 81–100, Meets 61–80, Needs improvement 0–60, and inside a band use the evidence to place the score. When the tutor sits between bands, say which band and what single change moves them up.

PLATFORM RUBRIC (the standard the score is measured against)
${PROFILE_RUBRIC}

PLATFORM RULES THAT BEAR ON SCORING
${PLATFORM_RULES}
- Every sub-criterion gets a 0–100 score AND one short improvement tip written as an instruction ("Shorten the video to 45 seconds and open with the student's goal").
- A criterion with no data scores no higher than 40 and its tip must say how to supply the missing thing.
- Success Probability Index: 0–100%, your honest estimate that this profile converts a random relevant visitor into a paid trial in the next 30 days. Base it on the numbers above, ratings, response time and how competitive the price is on this platform right now.

SUPER TUTOR MONITOR
Research ${platform.name}'s current Super Tutor / top-tutor criteria (assessment is monthly over a trailing 90 days) and check this tutor against each one, with their actual value and the required target. If the platform has no equivalent programme, use its published ranking factors instead.

AUDIT REPORT
- strengths: 3–5 things that are genuinely working, each with the number or fact that shows it.
- weaknesses: 3–5 things actively costing bookings.
- actions: EXACTLY 3 concrete actions, ordered by impact. Each action needs a title, the reason it matters (with the number behind it), exactly how to do it this week, and an impact rating.

Also produce a summary of 3–4 sentences written to the MENTOR, not to the tutor: where this person stands and what to say to them.

${tutorHeader(tutor)}

${accountBlock(tutor)}

${performanceBlock(tutor)}

${commsBlock(tutor)}

${JSON_RULE}
`.trim(),
  };
}

/* ------------------------------------------- 4. communication analysis -- */

export function communicationPrompt(tutor: Tutor, rawText: string): CopyPrompt {
  const schema = {
    log: "The clean version of this conversation: 2–4 sentences of plain English, third person, past tense. This is what gets saved as the log.",
    language: "fa",
    mood: "steady",
    swot: {
      strengths: ["…"],
      weaknesses: ["…"],
      opportunities: ["…"],
      threats: ["…"],
    },
    followUps: [{ text: "Ask for their Insight page for the last 30 days", dueAt: "2026-09-20" }],
    actions: ["One thing the mentor should do or say next, in one line."],
    profileUpdates: {
      phase: "active",
      tags: ["IELTS", "evenings only"],
      priceUsd: 16,
      availabilityHours: 30,
      nextFollowUpAt: "2026-09-23",
      notes: "Saving for a laptop; internet drops after 10pm.",
      sourceTextAppend: "Mentioned she is taking the CELTA in October.",
      goal: { monthlyIncomeUsd: 400, hoursPerWeek: 24, studentsTarget: 12, studentTypes: ["Adults"], lifeGoal: "A laptop", lifeGoalCostUsd: 900 },
    },
  };
  return {
    id: "communication",
    title: "Log and analyze this conversation",
    purpose: "Turns a chat in Persian or English into a concise English log, a SWOT, your follow-ups — and the profile updates it implies.",
    schema: asJson(schema),
    prompt: `
You are the mentor's chief of staff for a group of online English tutors. You read a chat between the mentor and one tutor, write it up cleanly, and work out what it should change.

${RESEARCH}

LANGUAGE
The chat may be in Persian (Farsi), English, or a mix of both, in either direction. Understand it as written.
- Write every output value in English, regardless of the language used.
- Keep proper nouns, place names and numbers exactly as they were.
- If a figure was spoken in Toman, convert it to dollars at ${Math.round(1000)} Toman per dollar unless a rate is given, and say which unit it was said in.

TASK
1. log — the clean version: 2–4 sentences of plain English, third person, past tense, no filler. This is what the mentor keeps instead of the raw chat, so it must stand alone: what was discussed, what was agreed, any numbers, any problem. Do not use the words "the tutor" more than once — use their name.
2. language — "fa", "en", or "mixed".
3. mood — one of: thriving, steady, worried, at-risk, unknown.
4. swot — the TUTOR'S situation, not the mentor's. Strengths and weaknesses describe them; opportunities are the concrete openings visible now; threats are what will realistically derail them if nothing changes.
5. followUps — every specific thing the mentor promised or should chase, each with a realistic due date (ISO). Empty array if there are none.
6. actions — what the mentor should do next, one line each, highest impact first.
7. profileUpdates — ONLY what this conversation actually justifies, from the fields listed below. Omit any field the conversation did not address; do not guess, and do not restate what the profile already says.

   - phase: move it only on real evidence — "preparing" to "waiting" when documents are submitted or the account is applied for, to "active" when lessons or earnings begin, to "passive" when they have stopped teaching.
   - tags: the tutor's practical facts (subjects, constraints, things to remember). Replace the list only if the chat shows the old tags are wrong.
   - priceUsd, availabilityHours, nextFollowUpAt: numbers and dates they stated.
   - notes: durable context for the mentor — what they are saving for, what is happening at home, what they asked you to remember. One or two sentences.
   - sourceTextAppend: new background fact that should feed future profile writing (a new certificate, a new subject, a change in hours).
   - goal: their targets, when they state or revise them.

RULES
- Never invent details that are not in the chat. If they did not mention numbers, do not supply any.
- If the chat flags payment trouble, burnout or an account problem, put it in threats AND make it a followUp.
- The log is the final record, so it must be accurate and complete, not a teaser.

${tutorHeader(tutor)}

${accountBlock(tutor)}

${commsBlock(tutor)}

${performanceBlock(tutor)}

${goalBlock(tutor)}

THE CHAT TO PROCESS (Persian and/or English)
---
${rawText}
---

${JSON_RULE}
`.trim(),
  };
}

/* ------------------------------------- 4b. the whole roster's messages -- */

/**
 * Every identity signal the AI can match a chat name against.
 *
 * This is the whole point of the batch sweep. The mentor's roster is written in one
 * script and the chat is written in another: علیرضا ابتهاج on the roster is "Alireza",
 * "Ali" or "+98912…" in a WhatsApp export, and sometimes "Mr. E" and nothing else. A
 * bare name list would make the model guess at exactly the step that must not be
 * guessed, so every signal the app already holds is put in front of it — the Latin
 * spelling the roster-import prompt worked out, the phone number in both formats, the
 * country and the platforms — and it is told to use all of them together.
 */
function rosterIndex(tutors: Tutor[]): string {
  return tutors
    .map((t, i) => {
      const platform = platformOf(t.platformId);
      const digits = (t.phone || "").replace(/\D/g, "");
      const bits = [
        `${i + 1}. ROSTER NAME (copy this exactly into "name"): ${t.name}`,
        t.latinName && t.latinName.toLowerCase() !== t.name.toLowerCase()
          ? `   · also written: ${t.latinName}`
          : "",
        t.latinName ? `   · first name: ${t.latinName.split(" ")[0]} · family name: ${t.latinName.split(" ").slice(-1)[0]}` : "",
        t.phone ? `   · phone: ${t.phone}${digits.length >= 4 ? ` (digits only: ${digits} · last 4: ${digits.slice(-4)})` : ""}` : "",
        `   · platform: ${platform.name}${tutorPlatforms(t).length > 1 ? ` · also ${tutorPlatforms(t).filter((p) => p.id !== platform.id).map((p) => p.name).join(", ")}` : ""}`,
        `   · phase: ${t.phase}`,
        t.country ? `   · country: ${t.country}` : "",
        t.tags.length ? `   · known facts: ${t.tags.join(", ")}` : "",
        `   · last logged conversation: ${t.logs.length ? t.logs.map((l) => l.at.slice(0, 10)).sort().slice(-1)[0] : "never"}`,
      ].filter(Boolean);
      return bits.join("\n");
    })
    .join("\n");
}

export function rosterCommsPrompt(tutors: Tutor[]): CopyPrompt {
  const schema = {
    conversations: [
      {
        name: "علیرضا ابتهاج",
        matchedAs: "Alireza / Ali / +98 912 000 0000",
        confidence: "high",
        date: "2026-09-20",
        log: "Said the first two trials went well but neither student rebooked. Asked whether to drop his price for the first month; agreed to hold the price and add a fifth subject instead. Internet still drops after 10pm.",
        language: "fa",
        mood: "worried",
        highlights: ["Two trials, no rebooking", "Wants to cut his price", "Internet unusable after 10pm"],
        followUps: [{ text: "Send the fifth-subject description to add to his profile", dueAt: "2026-09-23" }],
        actions: ["Send a trial-to-booking message template before Thursday"],
      },
    ],
    ambiguous: [
      { appearsAs: "Sara", candidates: ["سارا احمدی", "Sara Moradi"], why: "Two tutors on the roster use this first name and the chat never says which." },
    ],
    notOnRoster: [{ appearsAs: "Reza (new applicant)", why: "Talks like a tutor looking for a mentor, but no roster name, transliteration or phone number matches." }],
    /** Roster names you found nothing for — copied exactly, from the index above. */
    notMentioned: ["فاطمه رضایی"],
  };

  const count = tutors.length;
  return {
    id: "roster-comms",
    title: "Write up every tutor's messages from one export",
    purpose:
      "Give your AI the chat export (or any long transcript) and it writes one short English Communication entry for every tutor of yours it can find — matching names across scripts — and hands back one JSON block.",
    schema: asJson(schema),
    prompt: `
You are the mentor's chief of staff for a group of ${count} online English tutors. The mentor coaches them, one to one, mostly in Persian and English.

WHAT I AM GIVING YOU
The next message, or the file attached to it, is a long raw export of the mentor's conversations — a WhatsApp, Telegram, Preply, Discord or email history, or a pile of pasted messages. It may be tens of thousands of words. It may cover weeks. It is in Persian (Farsi), English, or a mix, in either direction. Some of it is the mentor talking, which is not a tutor's message and must not be logged as one.

THE JOB
Find every tutor from MY ROSTER below who appears in that export, read what passes between us, and write ONE Communication entry per tutor. Nothing else. Do not write up anyone who is not on the roster.

Matching a chat name to a roster name is the hardest and most important step, and it is where a careless answer is worse than no answer:
1. THE TWO SIDES ARE USUALLY IN DIFFERENT SCRIPTS. A roster name in Persian (علیرضا ابتهاج) almost always appears in the chat as Latin letters ("Alireza", "Alireza Ebtehaj", "Ali", "Mr Ebtehaj"), or the reverse. Treat those as the same person and match on meaning, not on spelling.
2. USE EVERY SIGNAL TOGETHER, never a name alone: the Latin spelling in the roster, the given name, the family name, the phone number in any format (+98 912…, 0912…, 98912…, "last four 0000"), a saved contact name, a platform handle, a user id, the country, the subjects and the known facts I list.
3. THE SAME PERSON MAY APPEAR SEVERAL WAYS in one export — "Sara" from her phone, "سارا احمدی" quoted in a forward, "+98912…" in the header. Gather them into ONE entry, not three.
4. PARTIAL NAMES ARE ENOUGH ONLY WHEN THEY ARE UNAMBIGUOUS. If the export says "Sara" and exactly one roster tutor could be Sara, match her. If two could, do NOT pick — put it in "ambiguous" with both candidate names and say what would settle it.
5. NEVER GUESS. It is far better to report someone in "notOnRoster" or "ambiguous" than to attach a conversation to the wrong tutor, because this writes a permanent entry into that tutor's record. If you are not sure, you are not sure.
6. Nicknames, voice-note transcriptions and Latin transliterations of Persian given names are common — Behzad/BJ, Fatemeh/Fati, Mohammad/Reza/Mamad. Use judgement, and send anything genuinely unclear to "ambiguous".

WRITING EACH ENTRY — this is the other half of the job, and the bar is high
- The "log" is what the mentor will actually read, in a month, instead of the chat. Write it in ENGLISH, third person, past tense. One to three sentences. No preamble ("The conversation covered…"), no filler, no advice, no restating what was already known.
- Keep every number, date, price, name and commitment exactly as stated. If they said it in Toman, keep the amount and say which unit.
- Write what changed or what matters: what was agreed, what went wrong, what they asked for, what they are worried about. Skip the small talk, the greetings and anything the mentor already knew.
- Never invent anything. If the export does not say it, it does not go in the log.
- If a tutor's messages are trivial — "hello", "thanks", a thumbs up — still log it truthfully in ONE short sentence, and set "mood" to "steady". Do not pad it and do not skip them: an empty answer for someone who clearly wrote is less useful than "Exchanged greetings; nothing discussed."
- "highlights" is up to 4 short fragments, each under 12 words, for scanning.
- "followUps" is only what the mentor promised or must chase, each with a realistic ISO due date. Empty array if none.
- "actions" is one line, highest impact first. Empty array if there is nothing to do.
- "date" is the ISO date of the LAST message in that conversation.
- "language" is "fa", "en" or "mixed".
- "mood" is one of: thriving, steady, worried, at-risk, unknown — the TUTOR'S state, not the mentor's.
- Also return "notMentioned": the roster names you found nothing for. That list is how the mentor knows the export was read properly, so be complete and use the roster names exactly.

DO NOT propose profile changes, phases, tags, prices or goals in this run. This pass writes the Communication log and nothing else.

MY ROSTER — ${count} tutor${count === 1 ? "" : "s"}. Use ONLY these names in "name", copied exactly, character for character:
${rosterIndex(tutors)}

OUTPUT
Reply with ONE valid JSON object and nothing else. No prose, no markdown fences. Every key present, even when a list is empty.
${asJson(schema)}
`.trim(),
  };
}

/* ------------------------------------------------------ 5. weekly report -- */

export function weeklyReportPrompt(tutors: Tutor[], weekOf: string): CopyPrompt {
  const schema = {
    weekOf,
    updates: [
      {
        name: "Tutor name exactly as it appears in my pasted numbers",
        earningsUsd: 120,
        lessons: 14,
        trials: 3,
        trialsConverted: 2,
        activeStudents: 6,
        newStudents: 2,
        rating: 4.9,
        responseHours: 3,
        cancellations: 0,
        notes: "Anything the numbers imply, one line.",
      },
    ],
    missing: ["Names I could not match to a tutor"],
    insights: ["One sentence per tutor worth a look this week, highest impact first."],
  };
  const roster = tutors.map((t) => `- ${t.name} (id ${t.id}, ${t.platformId}, phase ${t.phase})`).join("\n");
  return {
    id: "weekly-report",
    title: `Weekly update · week of ${weekOf}`,
    purpose: "Paste everyone's numbers in one go; each tutor's figures, scores and alerts update together.",
    schema: asJson(schema),
    prompt: `
You are the analyst for a mentor running a roster of online English tutors. Once a week the mentor collects each tutor's numbers and pastes them below in loose form.

TASK
1. Read the pasted numbers, which may be a list, a table, or chat messages, in any order and any format (Farsi or English).
2. Match each entry to a tutor by name. Match on first name when the full name is not given, and be tolerant of spelling. If a name matches nothing on the roster, put the original line in "missing" — never invent a tutor.
3. Convert the numbers into the JSON contract. If a figure was not given, use 0 for counts and "" for text. Never estimate a missing figure.
4. Write "insights": one sentence per tutor whose numbers moved the wrong way or who hit a milestone, ordered by how much it matters.
5. Note in "notes" anything the numbers imply but the mentor did not say, such as a trial-to-subscription rate below 50% or a response time over 24 hours.

ROSTER TO MATCH AGAINST
${roster || "(the roster is empty)"}

PASTED NUMBERS FOR THE WEEK OF ${weekOf}
---
(ready for you to paste the week's numbers here)
---

${JSON_RULE}
${asJson(schema)}
`.trim(),
  };
}

/* ------------------------------------------------------- 6. goal wizard -- */

export function goalWizardPrompt(tutor: Tutor, answers: string): CopyPrompt {
  const schema = {
    goal: {
      monthlyIncomeUsd: 400,
      hoursPerWeek: 20,
      studentsTarget: 12,
      studentTypes: ["Adults", "IELTS candidates"],
      lifeGoal: "A new laptop",
      lifeGoalCostUsd: 900,
      notes: "Constraints and honest caveats.",
    },
    plan: {
      summary: "How this tutor gets from today's numbers to the goal, in four or five sentences.",
      weeks: [
        { week: 1, focus: "Theme of the week", actions: ["Concrete action", "Concrete action"], metric: "The number to check on Sunday" },
      ],
    },
  };
  return {
    id: "goal-wizard",
    title: "Smart Goal Wizard → 90-day plan",
    purpose: "Turns their goals and constraints into a week-by-week growth plan with a metric for each week.",
    schema: asJson(schema),
    prompt: `
You are a growth coach for online English tutors. You build plans that survive contact with real life.

${RESEARCH}

TASK
Read the tutor's goals and answers, then produce a realistic 90-day plan.

REQUIREMENTS
- Work from their ACTUAL numbers below. If the goal needs more hours than they have, say so in notes and show what is achievable instead.
- Income math must be explicit: hourly rate × lessons per week × 4.3, minus the platform's ${Math.round((platformOf(tutor.platformId).commission || 0) * 100)}% cut and the unpaid trial lessons.
- weeks: exactly 13 entries, week 1 to 13, each with a theme, 3–5 concrete actions (imperative, doable in that week, no vague advice), and ONE metric to check on Sunday.
- Order the weeks so the highest-leverage changes happen first, and so later weeks build on the numbers the earlier weeks produced.
- Warn in notes about anything that will block them: no video yet, price too high for the market, availability that does not match where their students live.

${tutorHeader(tutor)}

${accountBlock(tutor)}

${performanceBlock(tutor)}

THEIR GOALS AND CONSTRAINTS (as told to the mentor)
---
${answers || "(no answers given — ask for income target, hours available, who they want to teach, and what they are saving for)"}
---

${JSON_RULE}
`.trim(),
  };
}

/* -------------------------------------------------- 7. consulting chatbot -- */

export function consultingPrompt(tutor: Tutor, question: string): CopyPrompt {
  return {
    id: "consulting",
    title: "Consulting answer",
    purpose: "A senior mentor's written answer to one question, grounded in this tutor's real data.",
    schema: `{
  "answer": "The full written answer. Markdown headings and bullet lists are allowed.",
  "numbers": ["Any figure you used, with its source"],
  "nextSteps": ["What the mentor should do or tell the tutor this week"],
  "sources": [{ "title": "…", "url": "https://…" }]
}`,
    prompt: `
You are a senior mentor with ten years of experience managing tutors on ${platformOf(tutor.platformId).name}. You write the way a knowledgeable human talks: direct, warm, specific, no filler.

${RESEARCH}

SCOPE
You answer questions about the platform's rules, profile and ranking, pricing, student acquisition, retention, scheduling, motivation and burnout.
You do NOT help with teaching methods or with payments outside the platform. If asked, say it is out of scope and point to the right place.

TASK
Answer the mentor's question below. Ground every claim in the tutor's actual data and in what you found online. Use numbers. Where you present a comparison, keep it as a short markdown table. If you are unsure, say what you would check rather than guessing.

${tutorHeader(tutor)}

${accountBlock(tutor)}

${performanceBlock(tutor)}

${goalBlock(tutor)}

${commsBlock(tutor)}
${tutor.audit ? `\nLAST AUDIT\nPower score ${tutor.audit.powerScore}/100 · success probability ${tutor.audit.successProbability}%.\n${tutor.audit.summary}\nOpen actions:\n${tutor.audit.actions.map((a) => `- ${a.title}`).join("\n")}` : ""}

QUESTION FROM THE MENTOR
---
${question || "(no question typed yet)"}
---

${JSON_RULE}
`.trim(),
  };
}

/* ------------------------------------------------------ 8. message factory -- */

const TONE_BRIEFS: Record<string, string> = {
  cheerleader: "High energy, celebrating effort and progress. Short sentences. Genuine, never saccharine.",
  mentor: "Calm, wise, strategic. Names the next move and why it matters. Treats the tutor as a colleague.",
  "tough-love": "Direct and honest about what is not working, delivered with respect and belief in them. No blame, no soft-pedalling.",
  warmth: "Localised warmth for Iranian tutors: respectful, family-aware, mindful of the exchange rate and of power cuts or internet trouble. No pity.",
  pep: "A short daily pep talk built from their own numbers from this week.",
  celebration: "Congratulates a specific milestone with the number in it. Warm and shareable, three sentences maximum.",
  pretrial: "Sent shortly before a trial lesson: one encouraging line and two practical reminders they can act on in the next ten minutes.",
};

export function messageFactoryPrompt(
  tutor: Tutor,
  tone: string,
  occasion: string,
): CopyPrompt {
  const schema = {
    tone,
    occasion,
    messages: ["Short message one.", "A second, different angle on the same message.", "A third option."],
  };
  return {
    id: "messages",
    title: `Message · ${tone}`,
    purpose: "Writes platform-compliant, motivational messages in the tone you picked, ready to send.",
    schema: asJson(schema),
    prompt: `
You write messages from a mentor to an online English tutor (${platformOf(tutor.platformId).name}).

TONE
${TONE_BRIEFS[tone] || tone}

${RESEARCH}

RULES
- Platform-compliant: no contact details, no offers of free lessons or discounts, nothing that would break ${platformOf(tutor.platformId).name} rules.
- American English, active voice, no clichés, no metaphors.
- Every message must reference something concrete from this tutor's own data — a number, a milestone, a thing they said.
- Between 2 and 5 sentences. Messages the mentor can send as-is, without editing.
- Return three genuinely different options, not three rewordings.

OCCASION
${occasion || "General encouragement"}

${tutorHeader(tutor)}

${performanceBlock(tutor)}
${tutor.audit ? `\nAudit highlights: ${tutor.audit.summary}` : ""}
${commsBlock(tutor, 3)}

${JSON_RULE}
`.trim(),
  };
}

/* ------------------------------------------------------------------ 9. SOS -- */

export function sosPrompt(tutor: Tutor, trigger: string, snapshots: Snapshot[], audit?: Audit): CopyPrompt {
  const schema = {
    situation: "What is actually happening, in two sentences, with the numbers.",
    recovery: [
      { step: "First thing to do, today.", why: "Why it works.", when: "Today" },
      { step: "Second thing.", why: "…", when: "Within 48 hours" },
      { step: "Third thing.", why: "…", when: "This week" },
    ],
    message: "The exact message the mentor should send this tutor right now.",
    watchFor: ["What to check in 7 days to know if it worked."],
  };
  return {
    id: "sos",
    title: "SOS · Emergency recovery plan",
    purpose: "A three-point, time-boxed recovery plan the moment a tutor stalls.",
    schema: asJson(schema),
    prompt: `
You are the emergency desk for a mentor whose tutor is going backwards. Move fast, be concrete, do not moralize.

TRIGGER
${trigger}

${RESEARCH}

PLATFORM RULES THE PLAN MUST RESPECT
${PLATFORM_RULES}

TASK
Produce a 3-point recovery plan, ordered by urgency, each with what to do, why it works, and when it must happen. Then write the exact message the mentor should send now (platform-compliant, warm, specific, no clichés). Then list what to check in seven days to know whether it worked.

If the likely cause is burnout rather than performance, say so plainly and make the plan about load, not output.

${tutorHeader(tutor)}

${accountBlock(tutor)}

${performanceBlock(tutor, 12)}

${commsBlock(tutor)}
${audit ? `\nLAST AUDIT (score ${audit.powerScore}/100)\n${audit.summary}\n${audit.weaknesses.map((w) => `- ${w}`).join("\n")}` : ""}
${snapshots.length ? `\nTHIS WEEK'S RAW NUMBERS\n${snapshots.map((s) => `${s.weekOf}: $${s.earningsUsd}, ${s.lessons} lessons, ${s.trials} trials`).join("\n")}` : ""}

${JSON_RULE}
`.trim(),
  };
}

/* ---------------------------------------------------- 10. daily pep talk -- */

export function pepTalkPrompt(tutors: Tutor[]): CopyPrompt {
  const schema = {
    talks: [
      { name: "Tutor name", message: "The pep talk for this tutor, 2–4 sentences, built from their own week." },
    ],
  };
  const compact = tutors.slice(0, 40).map((t) => {
    const last = [...t.snapshots].sort((a, b) => (a.weekOf < b.weekOf ? -1 : 1)).slice(-1)[0];
    return `- ${t.name} (${t.platformId}, ${t.phase})${last ? `: last week $${last.earningsUsd}, ${last.lessons} lessons, ${last.trials} trials, rating ${last.rating || "n/a"}` : ": no numbers yet"}${t.audit ? `, power score ${t.audit.powerScore}` : ""}`;
  });
  return {
    id: "pep-talk",
    title: "Daily pep talk for the whole roster",
    purpose: "One short, personal message per tutor, written from their own numbers.",
    schema: asJson(schema),
    prompt: `
You write the mentor's daily round of encouragement. Each message must be personal, concrete and short.

${RESEARCH}

RULES
- 2–4 sentences per tutor. Reference their actual numbers, a milestone, or something they said.
- Match the message to where they are: someone in "preparing" needs momentum to finish documents; "waiting" needs patience and a plan for the first week; "active" needs the next lever; "passive" needs a reason to come back.
- If someone is slipping, acknowledge it honestly without pressure, and give one doable action.
- American English, active voice, no clichés.

ROSTER
${compact.join("\n") || "(roster is empty)"}

${JSON_RULE}
${asJson(schema)}
`.trim(),
  };
}

/* --------------------------------------------------- 10b. check and fix -- */

export function checkAndFixPrompt(text: string, label: string): CopyPrompt {
  return {
    id: "check-fix",
    title: `Check & fix · ${label}`,
    purpose: "Corrects grammar and phrasing, enforces the platform rules, and marks every change in bold.",
    schema: `{
  "fixed": "The corrected text, with every change wrapped in <strong>…</strong>.",
  "changes": ["One line describing each change you made."]
}`,
    prompt: `
You are an expert editor for tutor profiles on online teaching platforms.

TASK
Review the text below and return a corrected version.

RULES
1. Fix grammar, spelling and punctuation.
2. Rewrite for clarity and pull: active voice, concrete benefit, no clichés, no metaphors.
3. Enforce the platform rules: no contact details, no offers of free lessons or discounts, nothing that breaks the terms of service.
4. Keep the length within 15% of the original unless asked otherwise. Do not invent experience, qualifications or numbers.
5. Wrap EVERY word or phrase you changed in <strong> tags so the mentor can see the edits, and nothing else.

FIELD
${label}

ORIGINAL TEXT
---
${text}
---

${JSON_RULE}
${asJson({ fixed: "The corrected text…", changes: ["One line per change"] })}
`.trim(),
  };
}

/* ------------------------------------------------------ 11. price check -- */

export function priceBenchmarkPrompt(tutor: Tutor): CopyPrompt {
  const platform = platformOf(tutor.platformId);
  const schema = {
    currentUsd: 12,
    recommendedUsd: 14,
    marketLowUsd: 8,
    marketHighUsd: 22,
    rationale: "Why this range, with the sources you found.",
    raisePlan: [{ from: "$12", to: "$14", when: "After the 5th 5-star review", condition: "…" }],
    sources: [{ title: "…", url: "https://…" }],
  };
  return {
    id: "pricing",
    title: "Price benchmark",
    purpose: `Compares this tutor's rate with what ${platform.name} students actually pay right now.`,
    schema: asJson(schema),
    prompt: `
You benchmark tutor prices on ${platform.name}.

${RESEARCH}

TASK
Using current listings and community reports, find the competitive range for a tutor with this profile and subject mix, then recommend a specific starting rate and a gradual raise plan tied to concrete conditions (reviews earned, trials converted, demand for their slots).

Show the search results you relied on. If the range is wide, say so instead of pretending it is precise.

${tutorHeader(tutor)}

${accountBlock(tutor)}

${performanceBlock(tutor)}

${JSON_RULE}
`.trim(),
  };
}

/* --------------------------------------------------- 12. celebration -- */

export function celebrationPrompt(tutor: Tutor, milestone: string): CopyPrompt {
  const schema = {
    headline: "Short congratulatory line for the card",
    body: "Two or three sentences for the mentor to send.",
    shareText: "A one-line version the tutor could share.",
  };
  return {
    id: "celebration",
    title: "Celebration card",
    purpose: "Writes a congratulatory card you can send when a milestone lands.",
    schema: asJson(schema),
    prompt: `
You write milestone congratulations for a mentor to send to an online English tutor.

MILESTONE
${milestone || "(describe the milestone, e.g. first 100 lessons, 50M Toman earned, first 5-star review)"}

${RESEARCH}

Write a headline (under 60 characters), a body of two or three sentences that names the milestone and what it took, and a shareText the tutor could post. Warm, specific, no clichés, no metaphors.

${tutorHeader(tutor)}

${performanceBlock(tutor)}

${JSON_RULE}
`.trim(),
  };
}

/* --------------------------------------------- 13. insight page pasting -- */

export function insightPagePrompt(tutor: Tutor, weekOf: string): CopyPrompt {
  const schema = {
    weekOf,
    earningsUsd: 0,
    lessons: 0,
    trials: 0,
    trialsConverted: 0,
    activeStudents: 0,
    newStudents: 0,
    rating: 0,
    responseHours: 0,
    cancellations: 0,
    notes: "Anything in the pasted summary that the numbers do not capture.",
  };
  return {
    id: "insight-page",
    title: `Read an Insight page · ${weekOf}`,
    purpose: "Paste the platform's own summary or HTML export; it becomes one clean week of numbers.",
    schema: asJson(schema),
    prompt: `
You convert a platform dashboard export into one row of clean data.

TASK
I will paste either the text of a ${platformOf(tutor.platformId).name} Insight/statistics page, its HTML, or a screenshot description. Extract exactly the figures under the Overview section and return them as JSON.

RULES
- Use the 30-day figures when the page offers 7/30/90 day filters, and say in notes which filter you used.
- Earnings are the tutor's gross earnings in USD for the period, converted to a weekly figure by dividing by the number of days and multiplying by 7.
- Never guess. A figure that is not on the page becomes 0 and gets mentioned in notes.
- Response hours: convert minutes to hours with one decimal place.

PASTED PAGE
---
(ready for you to paste it here)
---

${JSON_RULE}
${asJson(schema)}
`.trim(),
  };
}

/* ------------------------------------------------------------- helpers ---- */

/** The 13 prompts available for one tutor, in the order the mentor works through them. */
export function tutorPrompts(tutor: Tutor): CopyPrompt[] {
  return [
    accountCreationPrompt(tutor),
    masterAuditPrompt(tutor),
    insightPagePrompt(tutor, new Date().toISOString().slice(0, 10)),
    communicationPrompt(tutor, ""),
    goalWizardPrompt(tutor, ""),
    consultingPrompt(tutor, ""),
    priceBenchmarkPrompt(tutor),
    sosPrompt(tutor, "", [], tutor.audit),
  ];
}

/** Group score, as the UI wants to show it. */
export function planProgress(plan: Plan90 | undefined): { done: number; total: number; percent: number } {
  if (!plan || !plan.weeks.length) return { done: 0, total: 0, percent: 0 };
  const done = plan.weeks.filter((w) => w.done).length;
  return { done, total: plan.weeks.length, percent: Math.round((done / plan.weeks.length) * 100) };
}
