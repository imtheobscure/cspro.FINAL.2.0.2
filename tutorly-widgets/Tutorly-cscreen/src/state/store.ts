import { useEffect, useRef, useSyncExternalStore } from "react";
import type { AppState, CanvasTemplate, ChatAttachment, ChatMessage } from "./types";
import { avatarAt, avatarForName, ensureRealAvatar, isGeneratedAvatar } from "../lib/avatars";

const STORAGE_KEY = "classroom-state-v1";
const CHANNEL_NAME = "classroom-bus-v1";

/**
 * Chat is the only unbounded part of the state, so it is the only part we trim.
 * 400 bubbles is far more than a lesson produces, and it keeps localStorage
 * well clear of its quota even with photos in the room.
 */
const MAX_MESSAGES = 400;

/**
 * Media above this size is NOT written to disk or broadcast to the other window.
 * localStorage gives the whole app ~5MB, and one 3-minute voice note is bigger
 * than that on its own — so big media stays in the tab that recorded it and the
 * other window renders a "session only" placeholder instead of a broken player.
 */
const PERSIST_MEDIA_LIMIT = 160 * 1024;

const defaultReactions = [
  { id: "r1", name: "Confetti Rain", emoji: "🎉", style: "rain" as const },
  { id: "r2", name: "Dancing Hearts", emoji: "❤️", style: "dance" as const },
  { id: "r3", name: "Explode Stars", emoji: "⭐", style: "explode" as const },
  { id: "r4", name: "Spiral Fire", emoji: "🔥", style: "spiral" as const },
  { id: "r5", name: "Fountain Claps", emoji: "👏", style: "fountain" as const },
  { id: "r6", name: "Wave Laugh", emoji: "😂", style: "wave" as const },
];

const defaultCanvasTemplates: CanvasTemplate[] = [
  { id: "essay", cat: "Writing Tools", name: "Comprehensive Essay Assessor", tags: ["writing", "assessment", "grammar", "track changes"], desc: "Full grammar, vocabulary, cohesion, register correction with inline suggestions and scores", prompt: "Build a comprehensive essay assessor with pasteable rich text, inline error tags, grammar/vocabulary/cohesion/register feedback, score summary, and track changes where removed/replaced text is red strikethrough and inserted text is bold glowing green." },
  { id: "outline", cat: "Writing Tools", name: "Writing Outline Generator", tags: ["writing", "outline", "essay"], desc: "Extracts or creates rich essay outlines from a topic or text", prompt: "Build a writing outline generator that creates thesis, topic sentences, evidence, counterargument, conclusion, and editable rich text sections from a topic or pasted text." },
  { id: "vocab", cat: "Writing Tools", name: "Vocabulary Enhancer", tags: ["vocabulary", "synonyms", "collocations"], desc: "Suggests synonym upgrades, collocations, and example sentences", prompt: "Build a vocabulary enhancer that lets users flag words, suggests synonym upgrades, collocations, register notes, and example sentences for each word." },
  { id: "grammar", cat: "Writing Tools", name: "Grammar Deep Dive", tags: ["grammar", "rules", "errors"], desc: "Finds grammar errors with rule explanations and rewrites", prompt: "Build a grammar deep-dive tool that identifies grammatical errors, explains the rule, gives corrected rewrites, and provides mini practice items for each error type." },
  { id: "rubric", cat: "Writing Tools", name: "Exam Rubric Feedback", tags: ["ielts", "toefl", "cefr", "rubric"], desc: "IELTS/TOEFL/CEFR criterion feedback with band scores", prompt: "Build an exam rubric feedback tool for IELTS/TOEFL/CEFR writing with criteria, band scores, strengths, weaknesses, and next-step targets." },
  { id: "error-exercises", cat: "Writing Tools", name: "Error Targeted Exercise Creator", tags: ["exercises", "errors", "practice"], desc: "Creates exercises from discovered errors", prompt: "Build an error-targeted exercise creator with fill-in-the-blanks, rewriting, sentence combining, and consolidation drills based on pasted error examples." },
  { id: "speech-analysis", cat: "Speaking Tools", name: "Speech Transcript Analyser", tags: ["speaking", "fluency", "transcript"], desc: "Analyses fluency, fillers, pragmatic errors, and scorecard", prompt: "Build a speech transcript analyser that annotates a conversation transcript for fluency, fillers, pronunciation patterns, pragmatic errors, and produces a scorecard." },
  { id: "roleplay", cat: "Speaking Tools", name: "Conversation & Role Play Builder", tags: ["dialogue", "role play", "speaking"], desc: "Creates follow-up dialogue scripts and speaking questions", prompt: "Build a conversation and role-play builder that creates follow-up dialogue scripts, speaking practice questions, role cards, and branch prompts from a topic or transcript." },
  { id: "lesson-plan", cat: "Teaching Tools", name: "Lesson Plan Creator", tags: ["lesson", "plan", "teacher"], desc: "Objectives, stages, timing, and materials", prompt: "Build a full lesson plan creator with editable objectives, stages, timing, materials, teacher language, anticipated problems, and extension tasks." },
  { id: "reading-comp", cat: "Teaching Tools", name: "Reading Comprehension Generator", tags: ["reading", "questions", "answer key"], desc: "Creates MCQ and short-answer questions from text", prompt: "Build a reading comprehension generator that accepts a text and creates multiple choice, short answer, vocabulary-in-context questions, and an answer key." },
  { id: "custom-rubric", cat: "Teaching Tools", name: "Custom Rubric Builder", tags: ["rubric", "assessment", "criteria"], desc: "Weighted rubric with 3-5 criteria and descriptive levels", prompt: "Build a custom rubric builder with 3-5 weighted criteria, descriptive performance levels, total scoring, and editable criterion rows." },
  { id: "grammar-drill", cat: "Teaching Tools", name: "Grammar Explanation & Drill", tags: ["grammar", "drill", "practice"], desc: "Explanation followed by controlled practice", prompt: "Build a grammar explanation and drill page with clear rule explanation, examples, controlled practice, instant checking, and answer explanations." },
  { id: "resume", cat: "Design & Build", name: "Resume / CV Builder", tags: ["resume", "cv", "portfolio"], desc: "Responsive CV with sections, icons, and progress bars", prompt: "Build a modern responsive Resume/CV builder with editable personal info, experience, education, skills, icons, and progress bars." },
  { id: "infographic", cat: "Design & Build", name: "Data Driven Infographic", tags: ["infographic", "charts", "data"], desc: "SVG/CSS charts with live editable numbers", prompt: "Build a data-driven infographic with editable fields, SVG/CSS charts, statistics, icons, and numbers that update charts automatically." },
  { id: "newspaper", cat: "Design & Build", name: "Newspaper / Newsletter Page", tags: ["newspaper", "newsletter", "layout"], desc: "Masthead, multi-column layout, real stock images", prompt: "Build a newspaper/newsletter page with masthead, multi-column layout, real Unsplash/Pexels images, article cards, and full customisation." },
  { id: "worksheet", cat: "Design & Build", name: "Digital Worksheet", tags: ["worksheet", "interactive", "drag drop"], desc: "Drag and drop, fillable fields, embedded media", prompt: "Build an interactive digital worksheet with drag-and-drop, fillable fields, embedded audio/video placeholders, scoring, and answer checking." },
  { id: "event", cat: "Design & Build", name: "Event Landing Page", tags: ["event", "rsvp", "gallery"], desc: "Countdown, RSVP form, and photo gallery", prompt: "Build an event landing page for a school event/open day/parent evening with countdown timer, RSVP form, photo gallery, schedule, and map link." },
  { id: "magazine", cat: "Design & Build", name: "Magazine 2 Pages Spread", tags: ["magazine", "spread", "editorial"], desc: "Full bleed hero, overlays, teasers, elegant typography", prompt: "Build a two-page magazine spread with full-bleed hero image, headline overlays, article teasers, pull quotes, and elegant editorial typography." },
  { id: "chart-maker", cat: "Design & Build", name: "Chart Maker (Bar / Line / Pie)", tags: ["chart", "bar", "line", "pie", "json"], desc: "Interactive charts from pasted JSON", prompt: "Build a chart maker dashboard where pasted JSON renders beautiful interactive bar, line, and pie charts with editable labels and colors." },
  { id: "portfolio-gallery", cat: "Design & Build", name: "Portfolio Gallery", tags: ["portfolio", "gallery", "lightbox"], desc: "Masonry grid with filters and lightbox previews", prompt: "Build a portfolio gallery with masonry image grid, lightbox previews, filter buttons, project descriptions, and real stock imagery." },
  { id: "brochure", cat: "Design & Build", name: "Brochure", tags: ["brochure", "trifold", "services"], desc: "Trifold layout with services, pricing, testimonials", prompt: "Build a professional trifold-style brochure layout with services, pricing tables, testimonials, contact details, and real stock images." },
  { id: "slide-deck", cat: "Design & Build", name: "Interactive Presentation Slide Deck", tags: ["slides", "carousel", "presentation"], desc: "Editable carousel slides navigable by arrows", prompt: "Build an interactive presentation slide deck carousel with editable titles, text, images, keyboard navigation, and progress indicator." },
  { id: "product-book", cat: "Design & Build", name: "Product / Book Landing Page", tags: ["landing", "product", "book"], desc: "Hero, features, pricing, reviews, CTA", prompt: "Build a product/book landing page with hero section, features grid, pricing table, review carousel, and strong call-to-action button." },
  { id: "menu", cat: "Design & Build", name: "Restaurant / Cafe Menu", tags: ["menu", "restaurant", "cafe"], desc: "Styled menu with categories, prices, allergy icons", prompt: "Build a restaurant/cafe menu with categories, dish descriptions, prices, allergy icons, featured items, and real food photography." },
  { id: "school-home", cat: "Design & Build", name: "School / College Website Homepage", tags: ["school", "website", "homepage"], desc: "Hero, news, events calendar, quick links", prompt: "Build a school/college homepage with header, hero banner, news section, events calendar, quick links, admissions CTA, and footer." },
  { id: "teaching-portfolio", cat: "Design & Build", name: "Portfolio", tags: ["teacher", "portfolio", "contact"], desc: "About, teaching philosophy, qualifications, sample gallery", prompt: "Build a teacher portfolio with about me, teaching philosophy, qualifications, lesson sample gallery, testimonials, and contact form." },
  { id: "ecommerce-pricing", cat: "Design & Build", name: "E commerce Shop with Pricing Table Page", tags: ["shop", "pricing", "ecommerce"], desc: "Shop/product layout with three-tier pricing cards", prompt: "Build an e-commerce shop/pricing page with product highlights, three-tier pricing cards, popular badge, feature lists, and CTA buttons." },
  { id: "team", cat: "Design & Build", name: "Team / Staff Page", tags: ["team", "staff", "profiles"], desc: "Profile grid with photos, roles, bios", prompt: "Build a team/staff page with profile cards, photo, name, role, bio links, filters, and real portrait-style stock images." },
  { id: "testimonials", cat: "Design & Build", name: "Testimonial Page", tags: ["testimonial", "carousel", "ratings"], desc: "Quote cards carousel with avatars and stars", prompt: "Build a testimonial page with quote-card carousel, customer avatars, names, rating stars, and smooth navigation." },
  { id: "faq", cat: "Design & Build", name: "FAQ Accordion Page", tags: ["faq", "accordion"], desc: "Expandable questions with smooth animations", prompt: "Build an FAQ accordion page with searchable questions, smooth expand/collapse animations, categories, and clear answer styling." },
  { id: "personal-brand", cat: "Design & Build", name: "About Me / Personal Brand Page", tags: ["personal", "brand", "cv"], desc: "Hero, story timeline, skills graph, social links", prompt: "Build an about me/personal brand page with hero, story timeline, skills graph, social links, and downloadable CV button." },
  { id: "wedding", cat: "Design & Build", name: "Wedding Invitation Page", tags: ["wedding", "invitation", "rsvp"], desc: "Elegant invitation with date, location, RSVP, gallery", prompt: "Build an elegant wedding invitation page with couple names, date, location, RSVP form, gallery, and romantic typography." },
  { id: "birthday", cat: "Design & Build", name: "Birthday Party Invitation", tags: ["birthday", "party", "invitation"], desc: "Colorful invitation with event details and map", prompt: "Build a fun colourful birthday party invitation with balloons, event details, RSVP, gallery, and map link." },
  { id: "photo-album", cat: "Design & Build", name: "Photo Album / Memory Book", tags: ["photo", "album", "memory"], desc: "Flip-through gallery with captions and reactions", prompt: "Build a photo album/memory book with flip-through gallery, captions, date stamps, and heart reactions." },
  { id: "travel-blog", cat: "Design & Build", name: "Travel Blog Post", tags: ["travel", "blog", "timeline"], desc: "Destination article with timeline, gallery, tips", prompt: "Build a travel blog post with destination title, day-by-day timeline, image gallery, tips section, and map-style embed placeholder." },
  { id: "recipe", cat: "Design & Build", name: "Recipe Page", tags: ["recipe", "food", "print"], desc: "Ingredients, steps, timing, serving size, print button", prompt: "Build a recipe page with ingredients list, step-by-step instructions, cook time, serving size controls, allergy notes, and print button." },
  { id: "diy", cat: "Design & Build", name: "DIY / Tutorial Guide", tags: ["diy", "tutorial", "guide"], desc: "Materials, numbered steps, tips, video placeholder", prompt: "Build a DIY/tutorial guide with materials list, numbered steps, images, pro-tip banners, warnings, and embedded video placeholder." },
  { id: "meal-planner", cat: "Design & Build", name: "Weekly Meal Planner", tags: ["meal", "planner", "table"], desc: "Editable weekly meals and shopping list", prompt: "Build a weekly meal planner with editable table for breakfast/lunch/dinner, shopping list side panel, and meal tags." },
  { id: "fitness", cat: "Design & Build", name: "Fitness Tracker Dashboard", tags: ["fitness", "dashboard", "progress"], desc: "Progress bars, calorie counter, workouts, badges", prompt: "Build a fitness tracker dashboard with progress bars, calorie counter, workout log table, achievement badges, and weekly summary." },
  { id: "budget", cat: "Design & Build", name: "Budget / Expense Tracker", tags: ["budget", "expenses", "pie chart"], desc: "Editable table and live pie chart summary", prompt: "Build a budget/expense tracker with editable categories, amounts, totals, and live pie chart summary." },
  { id: "habit", cat: "Design & Build", name: "Habit Tracker", tags: ["habit", "calendar", "heatmap"], desc: "Calendar heatmap and progress percentage", prompt: "Build a habit tracker with calendar heatmap, daily checkboxes, streak counter, and progress percentage." },
  { id: "book-review", cat: "Design & Build", name: "Book Review Page", tags: ["book", "review", "stars"], desc: "Cover, rating, review, similar carousel", prompt: "Build a book review page with cover, star rating, summary, detailed review, quotes, and similar book carousel." },
  { id: "movie-review", cat: "Design & Build", name: "Movie / Show Review", tags: ["movie", "review", "cast"], desc: "Poster, rating, cast grid, synopsis, comments", prompt: "Build a movie/show review page with poster, rating, cast grid, synopsis, comment-section layout, and recommendations." },
  { id: "manual", cat: "Design & Build", name: "Product User Manual", tags: ["manual", "search", "steps"], desc: "Expandable step-by-step guide with warnings", prompt: "Build a product user manual with searchable step-by-step sections, warning/note banners, expandable content, and quick links." },
  { id: "job-board", cat: "Design & Build", name: "Job Board Page", tags: ["jobs", "filters", "listings"], desc: "Search/filter listings with apply links", prompt: "Build a job board page with search bar, job listing cards, filters for location/type/salary, and apply links." },
  { id: "real-estate", cat: "Design & Build", name: "Real Estate Listing Page", tags: ["real estate", "property", "gallery"], desc: "Property gallery, details, map, agent contact", prompt: "Build a real estate listing page with property gallery, details grid for beds/baths/sqft, map placeholder, and agent contact form." },
  { id: "timeline", cat: "Design & Build", name: "Interactive Timeline", tags: ["timeline", "history", "scroll"], desc: "Horizontal scrollable event cards with images", prompt: "Build an interactive horizontal timeline for historical/personal events with event cards, images, dates, and detail popups." },
  { id: "comparison", cat: "Design & Build", name: "Comparison Table Page", tags: ["comparison", "table", "features"], desc: "Side-by-side features with checks and ratings", prompt: "Build a side-by-side comparison table for products/services with check/cross icons, rating stars, feature groups, and highlighted winner." },
  { id: "directory", cat: "Design & Build", name: "Directory / Resource Library", tags: ["directory", "resources", "search"], desc: "Searchable card grid with filters and preview links", prompt: "Build a directory/resource library with searchable grid cards, category filters, tags, and download/preview links." },
  { id: "blog-comments", cat: "Design & Build", name: "Blog Post with Comments", tags: ["blog", "comments", "article"], desc: "Article layout with comments and related posts", prompt: "Build a blog post page with article layout, static comment section, author box, related posts sidebar, and reading progress." },
];

const initialState: AppState = {
  npcs: [],
  learners: [],
  messages: [],
  polls: [],
  reactions: defaultReactions,
  canvasTabs: [],
  canvasTemplates: defaultCanvasTemplates,
  dialogues: [],
  tutor: {
    name: "Teacher",
    // A real photograph, like every other character in the room.
    avatar: avatarAt(0),
    info: "",
    facts: "",
  },
  settings: {
    soundEffects: true,
    backgroundChatter: false,
    panelOpen: true,
    liveViewerCount: 12,
    liveAuto: true,
    goLive: false,
  },
  speaker: { npcId: null, text: "", emoji: null, speaking: false },
  raisedHands: [],
  transcripts: [],
  transcriptTemplates: [
    { id: "t1", label: "Easy Answer", prompt: "Answer this question in an easy way:" },
    { id: "t2", label: "Translate", prompt: "Translate this into the learner's L1:" },
    { id: "t3", label: "Correct Grammar", prompt: "Correct any grammar in this sentence:" },
  ],
  participantScores: {},
  catSettings: {
    enabled: false,
    mode: "hover",
    voiceURI: "",
    rate: 1,
    pitch: 1,
    catEmoji: "😺",
  },
  peer: { hosting: false, peerId: null, controlGranted: null, pendingControl: null },
  classTimer: { targetTs: null, duration: 0, reminded: false },
  countdownTimer: { duration: 300, remaining: 300, running: false, fullscreen: false },
  activeReaction: null,
  floatingEmojis: [],
};

/**
 * Every character has a real person's photo.
 *
 * Rooms saved before the portrait library existed hold either no avatar or a
 * generated cartoon one; both are replaced here, on load, with a photograph from
 * `public/avatars/`. A photo a tutor chose — an upload, a paste, a picture of the
 * actual classmate — is never touched.
 */
function withRealAvatars(s: AppState): AppState {
  const tutor = s.tutor.avatar ? ensureRealAvatar(s.tutor, 0) : { ...s.tutor, avatar: avatarAt(0) };
  const npcs = (s.npcs || []).map((n, i) => ensureRealAvatar(n, i));
  return {
    ...s,
    tutor,
    npcs,
    learners: (s.learners || []).map((l, i) => ensureRealAvatar(l, i + 4)),
    messages: withRealFaces(s.messages || [], tutor, npcs),
  };
}

/**
 * The chat keeps its own copy of each author's photo, so fixing the roster alone
 * would leave cartoons on every old bubble. Each author is matched back to their
 * participant — by id first, then by name — so the face on a bubble always agrees
 * with the face in the participant list.
 */
function withRealFaces(
  messages: ChatMessage[],
  tutor: { name?: string; avatar?: string },
  npcs: { id: string; name: string; avatar?: string }[],
): ChatMessage[] {
  const byId = new Map(npcs.map((n) => [n.id, n.avatar]));
  const byName = new Map(npcs.map((n) => [n.name.trim().toLowerCase(), n.avatar]));
  const tutorName = (tutor.name || "").trim().toLowerCase();
  const taken = [tutor.avatar, ...npcs.map((n) => n.avatar)];
  return messages.map((m) => {
    if (m.system) return m; // the house notices are not a person
    if (m.authorAvatar && !isGeneratedAvatar(m.authorAvatar)) return m; // a photo the tutor chose stays
    const name = (m.authorName || "").trim().toLowerCase();
    const isTutorLine =
      m.outbound || (!!tutorName && name === tutorName) || /^(teacher|tutor|you|admin)$/.test(name);
    const face =
      (m.npcId ? byId.get(m.npcId) : undefined) ||
      byName.get(name) ||
      (isTutorLine ? tutor.avatar : undefined) ||
      (name ? avatarForName(m.authorName || "guest", taken) : undefined);
    return face && face !== m.authorAvatar ? { ...m, authorAvatar: face } : m;
  });
}

function loadInitial(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      // merge with defaults to handle missing keys after updates
      return withRealAvatars({
        ...initialState,
        ...stored,
        settings: { ...initialState.settings, ...(stored.settings || {}) },
        tutor: { ...initialState.tutor, ...(stored.tutor || {}) },
        speaker: { ...initialState.speaker, ...(stored.speaker || {}) },
        peer: { ...initialState.peer, ...(stored.peer || {}) },
        classTimer: { ...initialState.classTimer, ...(stored.classTimer || {}) },
        countdownTimer: { ...initialState.countdownTimer, ...(stored.countdownTimer || {}) },
        reactions: stored.reactions?.length ? stored.reactions : defaultReactions,
        canvasTemplates: mergeCanvasTemplates(stored.canvasTemplates),
        transcriptTemplates: stored.transcriptTemplates?.length
          ? stored.transcriptTemplates
          : initialState.transcriptTemplates,
        participantScores: stored.participantScores || {},
        catSettings: { ...initialState.catSettings, ...(stored.catSettings || {}) },
      });
    }
  } catch {}
  return withRealAvatars(initialState);
}

function mergeCanvasTemplates(stored?: CanvasTemplate[]): CanvasTemplate[] {
  if (!Array.isArray(stored) || stored.length === 0) return defaultCanvasTemplates;
  const seen = new Set(stored.map((t) => t.id));
  return [...stored, ...defaultCanvasTemplates.filter((t) => !seen.has(t.id))];
}

let state: AppState = loadInitial();
const listeners = new Set<() => void>();

const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;
let suppressBroadcast = false;

function persist() {
  try {
    // do not persist transient ui state
    const toSave = {
      ...state,
      messages: slimMessages(state.messages),
      activeReaction: null,
      floatingEmojis: [],
      raisedHands: [],
      speaker: { npcId: null, text: "", emoji: null, speaking: false },
      peer: { ...state.peer, hosting: false, peerId: null, controlGranted: null, pendingControl: null },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Out of quota (a long recording, a big video). Never let the whole lesson
    // state stop saving because one attachment was too heavy: write metadata only.
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...state, messages: stripAllMedia(slimMessages(state.messages)) }),
      );
    } catch {}
  }
}

function mediaTooBig(url?: string) {
  return !!url && url.length > PERSIST_MEDIA_LIMIT;
}

/** Inline `data:` URLs pasted into html (the old composer did this) can also blow the quota. */
function slimHtml(html: string) {
  if (!html || html.length < PERSIST_MEDIA_LIMIT) return html;
  return html.replace(/(data:[a-z/+.-]+;base64,)[A-Za-z0-9+/=]+/gi, (_m, head: string) =>
    // keep a 1-byte stub so the tag stays valid, the player just shows nothing
    `${head}`,
  );
}

function slimAttachment(a: ChatAttachment): ChatAttachment {
  const keepUrl = !a.sessionOnly && !a.url.startsWith("blob:") && !mediaTooBig(a.url);
  const thumbOk = a.thumb && a.thumb.length < PERSIST_MEDIA_LIMIT ? a.thumb : undefined;
  return {
    ...a,
    url: keepUrl ? a.url : "",
    thumb: thumbOk,
    sessionOnly: keepUrl ? a.sessionOnly : true,
  };
}

function slimMessage(m: ChatMessage): ChatMessage {
  return {
    ...m,
    html: slimHtml(m.html || ""),
    attachments: m.attachments?.map(slimAttachment),
  };
}

/** Trim the log and drop media too heavy for localStorage before saving. */
export function slimMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-MAX_MESSAGES).map(slimMessage);
}

function stripAllMedia(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    ...m,
    html: "",
    attachments: m.attachments?.map((a) => ({ ...a, url: "", thumb: undefined, sessionOnly: true })),
  }));
}

function emit() {
  for (const l of listeners) l();
  persist();
}

if (channel) {
  channel.onmessage = (ev) => {
    if (ev.data?.type === "state") {
      suppressBroadcast = true;
      state = ev.data.payload;
      emit();
      suppressBroadcast = false;
    } else if (ev.data?.type === "event") {
      for (const l of eventListeners) l(ev.data.payload);
    }
  };
}

function broadcastState() {
  if (suppressBroadcast || !channel) return;
  try {
    // BroadcastChannel copies the whole payload to every listening window, so a
    // 5MB blob URL would be re-sent on every keystroke. Send the same trimmed
    // shape that goes to disk: metadata always, media only when it is small.
    channel.postMessage({ type: "state", payload: { ...state, messages: slimMessages(state.messages) } });
  } catch {}
}

export const store = {
  get(): AppState {
    return state;
  },
  set(updater: (s: AppState) => AppState | void) {
    const next = updater(state);
    state = cloneState(next !== undefined ? next : state);
    emit();
    broadcastState();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

function cloneState(s: AppState): AppState {
  // Keep nested selectors reactive even when a caller mutates nested state in place.
  return {
    ...s,
    settings: { ...s.settings },
    tutor: { ...s.tutor },
    speaker: { ...s.speaker },
    peer: { ...s.peer },
    classTimer: { ...s.classTimer },
    countdownTimer: { ...s.countdownTimer },
    catSettings: { ...s.catSettings },
    participantScores: { ...s.participantScores },
    npcs: [...s.npcs],
    learners: [...s.learners],
    messages: [...s.messages],
    polls: [...s.polls],
    reactions: [...s.reactions],
    canvasTabs: [...s.canvasTabs],
    canvasTemplates: [...s.canvasTemplates],
    dialogues: [...s.dialogues],
    transcripts: [...s.transcripts],
    transcriptTemplates: [...s.transcriptTemplates],
    raisedHands: [...s.raisedHands],
    floatingEmojis: [...s.floatingEmojis],
  };
}

// transient events (don't persist) - reactions, sounds, peer signals etc
type EventHandler = (ev: { type: string; payload?: any }) => void;
const eventListeners = new Set<EventHandler>();

export const bus = {
  emit(type: string, payload?: any) {
    const ev = { type, payload };
    for (const l of eventListeners) l(ev);
    if (channel) {
      try {
        channel.postMessage({ type: "event", payload: ev });
      } catch {}
    }
  },
  on(fn: EventHandler) {
    eventListeners.add(fn);
    return () => eventListeners.delete(fn);
  },
};

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get()),
    () => selector(store.get()),
  );
}

export function useBus(handler: (ev: { type: string; payload?: any }) => void) {
  // Keep a stable ref so the effect never re-fires due to inline function identity changes.
  // The latest handler is always called because we read from the ref inside the listener.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const stable = (ev: { type: string; payload?: any }) => handlerRef.current(ev);
    const off = bus.on(stable);
    return () => {
      off();
    };
  }, []); // empty deps — mount once, always uses latest handler via ref
}

export function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 10);
}
