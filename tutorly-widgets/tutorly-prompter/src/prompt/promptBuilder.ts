import type { LearnerFacts, PromptSettings, CustomProfile } from "../types";

/**
 * Build the master prompt that the tutor will copy to an external AI.
 */
export function buildPrompt(args: {
  rawLesson: string;
  settings: PromptSettings;
  learner: LearnerFacts;
  customProfiles?: CustomProfile[];
}): string {
  const { rawLesson, settings, learner, customProfiles } = args;
  const profileGuide = profileInstructions(settings, customProfiles);
  const annotationGuide = `
=== CRITICAL: INLINE ANNOTATION CONVENTIONS ===
You MUST embed these markers directly inside EVERY "text" field. They are NOT separate fields.
The app parses them and renders them as PURE VISUAL formatting (colors, bold, underline).
No raw symbols will be visible to the tutor — the app removes them and applies styling.

MARKERS (placed inside the "text" string):
  *WORD*     → Nuclear stress: the word with HIGHEST emphasis in each thought group.
               Rendered as: bold + red + underline (very visible).
               Usually the LAST content word or the informationally newest word.
               Example: "I *REcord* my voice" (noun) vs "I re*CORD* the lesson" (verb)
               You can mark a stressed SYLLABLE within a word: "It's in*CRED*ible"
  word_word  → Connected speech/linking: words that blend together naturally.
               Rendered as: green curve between words (word‿word).
               Example: "not_at_all", "want_to", "kind_of", "let_me"
  /          → Short breath pause between chunks.
               Rendered as: small dot (·). No slash visible.
               Example: "Let me explain / in simple terms"
  //         → Longer pause for topic transitions.
               Rendered as: larger dot (▪). No double-slash visible.
               Example: "First the theory // now the practice"
  ↑          → Rising intonation (questions, lists, incomplete thoughts).
               Rendered as: ↗ arrow in purple.
  ↓          → Falling intonation (statements, answers).
               Rendered as: ↘ arrow in purple.
  {{Student}}→ Replaced with learner's actual name. Rendered in purple italic. No braces visible.
  [emotion]  → Body language cue. Rendered as emoji icon (🙂 🤩 🧐 🤗 🤔 👍).
               Valid: [smile] [serious] [excited] [warm] [curious] [encouraging]
               Place at END of sentences.

RULES:
- EVERY sentence MUST have at least one *stress* marker on the nuclear word
- Questions MUST end with ↑
- Statements MUST end with ↓
- Use / every 7-12 words for natural breath pauses
- Use // for topic transitions
- Do NOT use ^ or ~ markers — they are deprecated
- ALL other words (function words, non-stressed content words) are left unmarked — they render as normal text
- The tutor sees ZERO raw symbols — everything is visual colors and formatting

EXAMPLES:
  CORRECT: "text": "Now let's *LOOK* at this example / do you *SEE* it ↑ [curious]"
  CORRECT: "text": "Let_me tell you about my *TRA*velling experience // it was in*CRED*ible ↓ [excited]"
  CORRECT: "text": "Hi {{Student}} ↑ / so *GREAT* to see_you today [smile]"
  WRONG:   "text": "Now look at this example" (no stress marker)
  WRONG:   "text": "^Now ~look at this" (do NOT use ^ or ~)
`.trim();

  const sectionsGuide = sectionGuide(settings);

  // Teacher guide section schema
  const tg = settings.teacherGuide;
  const tgFields: string[] = [];
  if (tg.ccqs) tgFields.push('"ccqs": [string]  // Concept-checking questions');
  if (tg.extraExplanation) tgFields.push('"extraExplanation": string  // Detailed extra explanation');
  if (tg.sel) tgFields.push('"sel": string  // SEL social-emotional learning tip');
  if (tg.softSkills) tgFields.push('"softSkills": string  // Soft / future skill connection');
  if (tg.discussionQuestions) tgFields.push('"discussionQuestions": [string]  // Discussion questions recycling topic & language');
  if (tg.relatedVocabulary) tgFields.push('"relatedVocabulary": [string]  // Extra vocabulary related to the lesson');
  if (tg.relatedGrammar) tgFields.push('"relatedGrammar": string  // Grammar extensions the teacher should know');
  if (tg.homeworkIdea) tgFields.push('"homeworkIdea": string  // Homework idea for this section');
  if (tg.onlineChallenges) tgFields.push('"onlineChallenges": [string]  // Online class challenges & activities');
  if (tg.activities) tgFields.push('"activities": [string]  // Interactive activities for this section');
  if (tg.teacherTips) tgFields.push('"teacherTips": string  // Teaching tips & common pitfalls');
  if (tg.customItems.length > 0) {
    tg.customItems.forEach((item, i) => {
      tgFields.push(`"customItem${i + 1}": string  // ${item}`);
    });
  }

  const teacherGuideSchema = tg.enabled && tgFields.length > 0
    ? `"teacherGuide": {\n        ${tgFields.join(",\n        ")}\n      }`
    : "";

  const schema = `
JSON schema (return ONLY a JSON object — no prose, no markdown fences):

CRITICAL: The "text" field MUST contain inline annotation markers (*WORD*, ^word, ~word, /, //, ↑, ↓, word_word, [emotion], {{Student}}). 
These markers are parsed by the teleprompter app. Without them, the text will display as plain unstyled content.
Example of a VALID text field: "Hi {{Student}} ↑ / *let*'s start with a ~quick ^review // ready? [smile]"

{
  "title": string,
  "profile": "${settings.profile}",
  "learner": {
    "id": string,
    "name": string,
    "l1": string,
    "cefr": "A1"|"A2"|"B1"|"B2"|"C1"|"C2",
    "age": string,
    "interests": string,
    "goals": string,
    "notes": string
  },
  "targetMinutes": number,
  "sections": [
    {
      "id": string,
      "title": string,
      "kind": "warm_up"|"lead_in"|"presentation"|"practice"|"production"|"cooler"|"discussion"|"trial_intro"|"trial_assessment"|"trial_close"|"content_hook"|"content_body"|"content_cta"|"custom",
      "estimatedMinutes": number,
      "sentences": [
        {
          "text": string (REQUIRED: must contain *STRESS* markers and / pauses and ↑↓ arrows. No ^ or ~ markers),
          "ann": {
            "intonation": "up"|"down"|"flat",
            "pitchContour": number[],
            "bloom": "remember"|"understand"|"apply"|"analyze"|"evaluate"|"create",
            "emotion": "smile"|"serious"|"excited"|"warm"|"curious"|"encouraging"|"neutral",
            "waitTimeSec": number,
            "pronunciation": [{ "word": string, "ipa": string }],
            "translations": [{ "word": string, "tr": string }],
            "accentMarkers": [{ "word": string, "reason": string }],
            "predicted": [{ "q": string, "hint": string }],
            "confidenceBoost": string,
            "cues": [
              {
                "category": "question"|"slide"|"poll"|"activity"|"joke"|"transition"|"image"|"whiteboard"|"note",
                "text": string,
                "imageQuery": string,
                "durationSec": number,
                "hotkey": number
              }
            ]
          }
        }
      ],
      "cues": [ /* section-level cues, same shape as sentence cues */ ]${teacherGuideSchema ? ",\n      " + teacherGuideSchema : ""}
    }
  ],
  "glossary": [{ "term": string, "definition": string, "exampleSentence": string }],
  "notes": string
}
`.trim();

  // Verbosity instructions
  const verbosityGuide: Record<string, string> = {
    minimal: `
CONTENT QUANTITY: STANDARD output. Write a concise but complete lesson.
- Each main section (presentation, practice, production) should have at least 6-10 sentences.
- Warm-up and cooler: at least 4-6 sentences each.
- Include at least 2 examples per new concept.
- Each question must be followed by a wait cue and a possible answer model.`,
    average: `
CONTENT QUANTITY: EXTENDED output — approximately DOUBLE what you would normally produce.
- Each main section MUST have at minimum 12-20 sentences.
- Warm-up/lead-in/cooler: at least 6-10 sentences each.
- For every new concept: explain it, give 3 examples, elicit from the student, model correct form, confirm understanding.
- After every explanation, add a CCQ (concept-checking question) in the sentence stream.
- Include multiple reformulations and paraphrases — say the same idea 2-3 different ways.
- Every 3-4 sentences of teacher talk must include a student-engagement moment (question, pause, elicit).
- Transitions between activities must be scripted in full.
- Never summarize or abbreviate the source material — expand on everything.`,
    maximum: `
CONTENT QUANTITY: MAXIMUM (approximately 5× normal). This must fill the ENTIRE ${settings.targetMinutes} minutes when read at normal pace.
- Each main section MUST have 20-35+ sentences.
- Warm-up/cooler: 10-15 sentences each.
- For every single vocabulary item or grammar point: introduce it, contextualize it with 3 real-life examples personalized to the learner's interests, drill it, check understanding with 3 CCQs, model the answer, restate the rule, and connect it to what they already know.
- Include: anecdotes, humor, encouragement, cultural notes, L1 comparison hints, error anticipation scripts, recovery phrases for when the student is confused.
- Every activity in the teacherGuide must also appear as scripted teacher-talk sentences in the lesson.
- EVERY word the tutor might say should be scripted. Nothing should be improvised.
- If the source material is short, EXPAND on each point extensively. Do NOT pad with filler — add genuine pedagogical value.`,
  };

  const must: string[] = [
    `Target total speaking time: ~${settings.targetMinutes} minute(s). FILL THIS ENTIRE TIME with scripted content.`,
    `Learner CEFR: ${learner.cefr}. Keep vocabulary and grammar appropriate.`,
    `Learner L1: ${learner.l1}. Add accentMarkers on sounds known to be hard for ${learner.l1} speakers (e.g. /θ/ /ð/ for Mandarin, /r/-/l/ for Japanese, /h/ for Spanish, /v/-/w/ for German/Russian, schwa for Romance L1s, etc.).`,
    `Replace student references with {{Student}} placeholder.`,
    `NON-NEGOTIABLE: Use inline annotation markers (*WORD*, /, //, ↑, ↓, word_word, [emotion]) in EVERY single "text" field. Every sentence must have at least one *nuclear stress* marker. Questions must end with ↑. Statements must end with ↓. Pauses use /. Do NOT use ^ or ~ markers. Without markers the app shows plain text.`,
    `NON-NEGOTIABLE: All markers go INSIDE the "text" string. Example: "text": "Hi {{Student}} ↑ / how are you *TO*day [smile]"`,
    `Cover ALL the source lesson material provided — do not skip or summarize any part of it.`,
  ];

  if (settings.includeBlooms)
    must.push(`Tag every question sentence with a Bloom level in ann.bloom.`);
  if (settings.includePronunciation)
    must.push(`Provide IPA in ann.pronunciation for any word likely difficult for an ${learner.l1}/${learner.cefr} learner.`);
  if (settings.includeTranslation && settings.bilingualMode)
    must.push(`Provide ann.translations into ${settings.translationLanguage} ONLY for key vocabulary (max 4 per sentence).`);
  if (settings.includePredictedQuestions)
    must.push(`On the first sentence introducing each new concept, add 1-3 likely student questions in ann.predicted.`);
  if (settings.includeFormative)
    must.push(`Insert formative-assessment "check for understanding" questions personalized using the learner facts (interests, goals).`);
  if (settings.includeWhiteboard)
    must.push(`Where a visual would help, add a cue with category "whiteboard" or "image" and a concrete Google-image search keyword in imageQuery.`);
  if (settings.teacherGuide.enabled)
    must.push(`For EVERY section, include a detailed "teacherGuide" object. CRITICAL QUALITY RULES for teacherGuide:
    - ccqs: At least 4-6 concept-checking questions per section. Each question must have a clear expected answer in parentheses. Example: "Is Rome still a place she can visit? (Yes — so it has present relevance → Present Perfect)"
    - extraExplanation: 3-5 paragraphs of detailed background knowledge. Include why this matters, common mistakes, L1 transfer issues, and multiple angles of explanation. The tutor should feel like an expert after reading this.
    - discussionQuestions: 4-6 questions with sample model answers. Format: "Q: ... — Model answer: ..."
    - relatedVocabulary: 8-15 terms with brief definitions
    - relatedGrammar: Full explanation with examples and edge cases
    - homeworkIdea: Specific, actionable, with clear instructions the tutor can dictate
    - onlineChallenges: 3-5 interactive activities with step-by-step instructions
    - activities: 3-5 activities with full procedure described
    - teacherTips: Common pitfalls, recovery phrases, and expert advice`);

  const customInstr = settings.customInstructions?.trim();
  const customActivitiesStr = settings.teacherGuide.customItems?.filter(Boolean).join(", ");

  return [
    `You are an expert ${profileGuide.label} script writer for an online 1-on-1 tutor.`,
    `Write a complete teleprompter-ready script the tutor will read OUT LOUD to the learner.`,
    `Speak in first person to the learner. Be warm, concise, and natural.`,
    ``,
    verbosityGuide[settings.verbosity] || verbosityGuide.average,
    ``,
    `=== PROFILE ===`,
    profileGuide.body,
    ``,
    `=== STRUCTURE ===`,
    sectionsGuide,
    ``,
    `=== LEARNER FACTS ===`,
    `Name: ${learner.name || "(unspecified — use {{Student}})"}`,
    `Native language (L1): ${learner.l1}`,
    `CEFR: ${learner.cefr}`,
    `Age: ${learner.age || "n/a"}`,
    `Interests: ${learner.interests || "n/a"}`,
    `Goals: ${learner.goals || "n/a"}`,
    `Other notes: ${learner.notes || "n/a"}`,
    `Target accent: ${learner.targetAccent || "General American English"}`,
    ``,
    `=== ACCENT-SPECIFIC PRONUNCIATION ===`,
    `When words have special pronunciation in ${learner.targetAccent || "American English"} that differs from other accents (e.g. "wanted" /ˈwɑːnɪd/ in AmE vs /ˈwɒntɪd/ in BrE, "schedule" /ˈskedʒuːl/ in AmE vs /ˈʃedjuːl/ in BrE), add them to ann.pronunciation with the ${learner.targetAccent || "American English"} IPA. Also add an accentMarker explaining the accent-specific feature.`,
    ``,
    `=== TIMING SETTINGS ===`,
    `Default wait time after questions: ${settings.waitTimeSec} seconds. Use this value in ann.waitTimeSec for all question sentences.`,
    ``,
    `=== MUST-FOLLOW RULES ===`,
    ...must.map((m, i) => `${i + 1}. ${m}`),
    ``,
    customActivitiesStr ? `=== CUSTOM ACTIVITIES TO INCLUDE ===\n${customActivitiesStr}\n` : "",
    customInstr ? `=== ADDITIONAL INSTRUCTIONS FROM THE TUTOR ===\n${customInstr}\n` : "",
    `=== ANNOTATION CONVENTIONS (inside each "text" field) ===`,
    annotationGuide,
    ``,
    `=== OUTPUT FORMAT ===`,
    schema,
    ``,
    `=== SOURCE LESSON MATERIAL (what the tutor wants to teach) ===`,
    rawLesson.trim() || "(none provided — invent a CEFR-appropriate topic from learner interests)",
    ``,
    `Return ONLY the JSON object. No commentary. No markdown fences. Start with { and end with }.`,
    ``,
    `FINAL REMINDER: EVERY "text" field MUST contain at least one *STRESS* marker and intonation arrow (↑ or ↓). Do NOT use ^ or ~ markers. A text field without *stress* markers is INVALID and will render as plain unstyled text.`,
  ].join("\n");
}

// ----- Profile-specific guidance -----

function profileInstructions(s: PromptSettings, customProfiles?: CustomProfile[]): { label: string; body: string } {
  switch (s.profile) {
    case "lesson":
      return {
        label: "language/concept lesson",
        body: [
          "Profile: Lesson Plan. Use a clear PPP/ESA-style flow.",
          "If teaching a language, balance: meaning → form → pronunciation → controlled practice → freer practice.",
          "If teaching a non-language concept, balance: hook → explanation → worked example → guided practice → independent practice.",
        ].join("\n"),
      };
    case "free_discussion":
      return {
        label: "free discussion",
        body: [
          "Profile: Free Discussion. Almost no teacher-talk-time monologue.",
          "Generate mostly open-ended questions, follow-ups, devil's-advocate prompts, and recasts.",
          "Group questions by sub-topic, escalating Bloom level.",
        ].join("\n"),
      };
    case "friendly_chat":
      return {
        label: "friendly chat / rapport",
        body: [
          "Profile: Friendly Chat. Casual register, contractions, fillers (well, you know).",
          "Lots of personal questions tied to learner interests; mirror, validate, joke gently.",
        ].join("\n"),
      };
    case "trial_preply":
      return {
        label: "Preply trial lesson",
        body: [
          "Profile: Preply Trial Lesson (25 min default).",
          "Follow Preply's recommended trial structure strictly:",
          "  1) Warm welcome + tutor mini-intro (≤1 min).",
          "  2) Get-to-know-you questions (≈3 min).",
          "  3) Needs analysis: why are you learning, current level, prior experience (≈4 min).",
          "  4) Mini-diagnostic activity at learner's CEFR (≈8 min).",
          "  5) Personalized feedback: 2 strengths, 2 growth areas (≈3 min).",
          "  6) Concrete study plan proposal tied to their goals (≈4 min).",
          "  7) Soft CTA to book a package + answer questions (≈2 min).",
          "Be warm, professional, never salesy.",
        ].join("\n"),
      };
    case "content_maker": {
      const platform = s.contentPlatform ?? "youtube";
      const platformRules: Record<string, string> = {
        youtube:
          "YouTube long-form: strong 15-sec hook, promise + payoff, retention pattern interrupts every 30s, clear CTA at end.",
        instagram:
          "Instagram Reel (≤60s): hook in first 1.5s, on-screen text cues, pattern break at ~5s, loopable ending.",
        tiktok:
          "TikTok (≤60s): conversational hook in first 1s, trend-aware phrasing, fast cuts implied by // longer pauses, end with question to drive comments.",
        shorts:
          "YouTube Shorts (≤60s): vertical, hook → value → CTA. No intro music; jump straight in.",
        profile_intro:
          "Tutor Profile Introduction video (60-90s) for a marketplace (Preply/italki style): WHO you are, WHO you teach, HOW you teach, WHY book you, end with warm invitation. Show personality.",
      };
      return {
        label: `content script for ${platform}`,
        body: [
          `Profile: Content Maker — ${platform}.`,
          platformRules[platform] || "",
          "Sections: content_hook, content_body, content_cta.",
        ].join("\n"),
      };
    }
    case "profile_intro":
      return {
        label: "tutor profile intro video",
        body: [
          "Profile: Profile Introduction Video (60-90s).",
          "Structure: Hook → Who I am → Who I help → How I teach → A small proof/result → Warm CTA.",
          "Use {{Student}} sparingly; this is to camera, not to one learner.",
        ].join("\n"),
      };
    case "custom": {
      const cp = customProfiles?.find((p) => p.id === s.customProfileId);
      if (cp) {
        return {
          label: cp.name,
          body: `Profile: ${cp.name}.\n${cp.description}\n${cp.instructions}`,
        };
      }
      return {
        label: "custom",
        body: "Profile: Custom. Follow any instructions in the custom instructions field.",
      };
    }
    default:
      return {
        label: "lesson",
        body: "Profile: General lesson.",
      };
  }
}

function sectionGuide(s: PromptSettings): string {
  if (s.profile === "trial_preply") {
    return "Use these section kinds in order: trial_intro, trial_assessment, trial_close. Subdivide as needed but keep total ≈ targetMinutes.";
  }
  if (s.profile === "content_maker" || s.profile === "profile_intro") {
    return "Use these section kinds in order: content_hook, content_body, content_cta.";
  }
  if (s.profile === "free_discussion" || s.profile === "friendly_chat") {
    return "Use section kinds: discussion (you may have several, grouped by sub-topic).";
  }
  // lesson / custom
  const parts: string[] = [];
  if (s.includeWarmUp) parts.push("warm_up");
  if (s.includeLeadIn) parts.push("lead_in");
  parts.push("presentation", "practice", "production");
  if (s.includeCooler) parts.push("cooler");
  return `Use these section kinds in order: ${parts.join(", ")}.`;
}
