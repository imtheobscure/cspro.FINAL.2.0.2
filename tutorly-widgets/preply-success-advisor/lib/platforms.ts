import type { Platform, Tutor } from "../types";
import { PLATFORM_LOGO_DOMAINS, PLATFORM_LOGOS, logoUrlForDomain } from "./platformLogos";

/**
 * The platforms you recruit for.
 *
 * Two things matter here and nowhere else: the **color** (so a tutor's card, chip and
 * glow are recognizable at a glance) and the **rules + account fields**, which are
 * what make the account-creation prompt correct for that site's profile page instead
 * of generic advice.
 *
 * Color provenance is recorded per platform and shown in Settings, because only two
 * of these are published brand codes:
 *   - Preply — Flamingo Pink #FF79AC (brand palette, Eerie Black #121118 as ink)
 *   - italki — #FF4338 (BrandColorCode's published italki palette)
 * The rest are taken from each site's own interface, so they read correctly next to
 * the real thing, but treat them as a starting point: every color is editable in
 * Settings, and the app uses your value everywhere.
 *
 * Logos are the platforms' own favicons, inlined as data URLs in `lib/platformLogos.ts`
 * so a chip shows the real mark rather than a guessed emoji, and keeps showing it with no
 * network. `logoUrl` is editable in Settings for anything not in that list.
 *
 * Commission numbers are the platforms' published tutor cuts where they have one and
 * an editable estimate where they pay per lesson instead of taking a percentage.
 */

/** Build an entry with its logo already attached, so no icon is ever just an emoji. */
const withLogo = (platform: Platform): Platform => ({
  ...platform,
  logoUrl:
    PLATFORM_LOGOS[platform.id] ??
    (PLATFORM_LOGO_DOMAINS[platform.id] ? logoUrlForDomain(PLATFORM_LOGO_DOMAINS[platform.id]) : undefined),
});
export const BUILTIN_PLATFORMS: Platform[] = [
  withLogo({
    id: "preply",
    name: "Preply",
    color: "#FF79AC",
    colorSource: "Preply brand palette (Flamingo Pink)",
    emoji: "🌸",
    commission: 0.18,
    signupUrl: "https://preply.com/en/become-a-tutor",
    accountFields: [
      "3 headlines (50–75 characters)",
      "Long description split into Introduce Yourself / Teaching Experience / Motivate Learners",
      "2 video scripts (45–60 seconds) with a pronunciation guide",
      "Years of experience",
      "Subjects with a tailored paragraph each",
      "Proficiency levels and student age groups",
      "Certificates and specialties",
      "Availability hours per week and hourly price",
    ],
    rules: [
      {
        label: "No off-platform contact",
        detail:
          "Never put an email, phone number, social handle, or any external link in profile text or video scripts.",
      },
      {
        label: "No free lessons or discounts",
        detail: "Tutors cannot offer free lessons, discounts, or bundle deals. Never suggest them.",
      },
      {
        label: "Anonymous content",
        detail:
          "Keep the tutor's name, country of birth, and native language out of the description and scripts. Use a neutral greeting.",
      },
      {
        label: "Paid trials",
        detail:
          "Trial lessons are paid and Preply keeps the full trial fee, so the trial is about conversion, not income.",
      },
      {
        label: "Reliability drives ranking",
        detail:
          "Cancellations and reschedules push the profile down; availability must be hours the tutor will genuinely teach.",
      },
      {
        label: "Super Tutor badge",
        detail:
          "Assessed on the 1st of each month over a trailing 90 days: 40+ lessons, 4.8+ rating, zero absences, trial-to-subscription 50%+, trial cancels ≤5%, lesson cancels ≤20%, and 80%+ of new messages and trials answered within 24 hours.",
      },
    ],
  }),
  withLogo({
    id: "classgap",
    name: "Classgap",
    color: "#00B8A9",
    colorSource: "Classgap interface accent",
    emoji: "🟢",
    commission: 0.15,
    signupUrl: "https://www.classgap.com/en/become-a-teacher",
    accountFields: [
      "Short presentation title",
      "About-me description with teaching method",
      "Subjects and levels taught",
      "Video presentation",
      "Availability calendar",
      "Hourly rate",
    ],
    rules: [
      {
        label: "Spanish-first marketplace",
        detail:
          "Most students arrive from Spain and Latin America. Keep the pitch plain, warm and concrete, and avoid idioms that only land in English.",
      },
      {
        label: "Method over credentials",
        detail: "Students pick on teaching method. Say how a first lesson actually runs.",
      },
      {
        label: "No external links",
        detail: "Never include contact details or links to other sites in the profile.",
      },
    ],
  }),
  withLogo({
    id: "nativecamp",
    name: "NativeCamp",
    color: "#F5333F",
    colorSource: "NativeCamp interface accent",
    emoji: "🔴",
    commission: 0,
    signupUrl: "https://nativecamp.net/en",
    accountFields: [
      "Tutor nickname and profile photo",
      "Self-introduction",
      "Languages spoken",
      "Lesson categories offered",
      "Available time slots",
    ],
    rules: [
      {
        label: "Pay per lesson, not per hour",
        detail:
          "Tutors are paid per completed lesson with no percentage cut, so income comes from volume and short lessons.",
      },
      {
        label: "Instant-lesson culture",
        detail: "Students mostly book immediate lessons, so availability freshness matters more than profile prose.",
      },
      {
        label: "Keep intros short",
        detail: "The introduction is read at a glance before an instant call — two or three friendly sentences.",
      },
    ],
  }),
  withLogo({
    id: "italki",
    name: "italki",
    color: "#FF4338",
    colorSource: "BrandColorCode published italki palette",
    emoji: "🟠",
    commission: 0.15,
    signupUrl: "https://www.italki.com/en/teach",
    accountFields: [
      "Short intro (one line)",
      "Professional teacher or community tutor pitch",
      "Video introduction",
      "Lesson types and packages with prices",
      "Teaching experience and certifications",
      "Availability",
    ],
    rules: [
      {
        label: "Professional vs community split",
        detail:
          "Professional teachers are expected to show certifications and structured curricula; community tutors sell conversation and culture.",
      },
      {
        label: "Packages and trials",
        detail: "italki expects trial lessons and lesson packages — price them as a ladder, not one flat rate.",
      },
      {
        label: "Written reviews carry the ranking",
        detail: "Review count and rating decide search position, so a review ask after every few lessons is the lever.",
      },
    ],
  }),
  withLogo({
    id: "palfish",
    name: "PalFish",
    color: "#FF8A00",
    colorSource: "PalFish interface accent",
    emoji: "🐠",
    commission: 0,
    signupUrl: "https://www.palfish.com/",
    accountFields: [
      "Teacher profile card",
      "Self-introduction audio or video",
      "Photo with a plain background",
      "Accent and nationality",
      "Available slots",
    ],
    rules: [
      {
        label: "Mobile-first classes",
        detail: "Lessons are taught on a phone app to mostly young learners, so the pitch must be visual and upbeat.",
      },
      {
        label: "Accent-focused students",
        detail: "Parents filter on accent clarity. Say what accent you teach and keep it consistent.",
      },
      {
        label: "Short attention spans",
        detail: "Scripts for young learners need simple sentences, energy, and a picture-friendly idea every few seconds.",
      },
    ],
  }),
  withLogo({
    id: "amazingtalker",
    name: "AmazingTalker",
    color: "#1B7DD8",
    colorSource: "AmazingTalker interface accent",
    emoji: "🔵",
    commission: 0.15,
    signupUrl: "https://en.amazingtalker.com/become-a-tutor",
    accountFields: [
      "Tutor headline",
      "Introduction video",
      "Self-introduction",
      "Teaching style and course offerings",
      "Trial price and lesson price",
      "Availability",
    ],
    rules: [
      {
        label: "The video is the storefront",
        detail:
          "AmazingTalker's search is video-led. A tutor with no video is ranked below one with a clear, short introduction.",
      },
      {
        label: "Asian-market students",
        detail: "Most learners are in Taiwan, Japan, Hong Kong and Korea — the pitch travels well in plain English.",
      },
      {
        label: "Pricing tiers",
        detail: "Trial lessons are cheap on purpose and conversion depends on upselling a package in the trial.",
      },
    ],
  }),
  withLogo({
    id: "lingoace",
    name: "LingoAce",
    color: "#0A3A8C",
    colorSource: "LingoAce interface accent (deep blue with the coral logo mark)",
    emoji: "🐯",
    commission: 0,
    signupUrl: "https://www.lingoace.com/become-a-teacher/",
    accountFields: [
      "Teacher profile photo and short video intro",
      "Self-introduction (English and Chinese versions)",
      "Certificates and teaching qualifications",
      "Preferred age groups and class types",
      "Weekly availability in Beijing time (UTC+8)",
      "Hourly rate or salary expectation",
    ],
    rules: [
      {
        label: "Hiring pipeline, not a marketplace",
        detail:
          "Applicants are hired by the company rather than listed for students to book. The profile is read by a recruiter against fixed criteria, so lead with qualifications and availability, not with personality prose.",
      },
      {
        label: "Demo class is the deciding step",
        detail:
          "A recorded or live demo lesson usually follows the profile review. Prepare one 10-minute segment for young learners rather than a general pitch.",
      },
      {
        label: "Beijing time",
        detail:
          "Availability is asked for in Beijing time (UTC+8); state it in that timezone so it can be checked at a glance.",
      },
      {
        label: "Young learners and bilingual classes",
        detail:
          "Mostly children and teens, in Mandarin or English. Show classroom energy, patience and a clear accent.",
      },
    ],
  }),
  withLogo({
    id: "custom",
    name: "Other platform",
    color: "#7A5CFF",
    colorSource: "App default for custom platforms",
    emoji: "➕",
    commission: 0.15,
    signupUrl: "",
    accountFields: [
      "Profile headline",
      "About-me description",
      "Video introduction",
      "Subjects and levels",
      "Availability",
      "Hourly rate",
    ],
    rules: [
      {
        label: "Rules unknown",
        detail:
          "This is a custom platform: add its rules in Settings so the prompts stop guessing. Until then, the prompts keep the content free of contact details and free-lesson offers.",
      },
    ],
  }),
];

export const DEFAULT_PLATFORM_ID = "preply";

/**
 * Every platform a tutor is on, primary first, as full records.
 *
 * A tutor can be listed on several marketplaces. `platformId` is the primary and stays
 * the single source of truth for anything that needs exactly one (the account-content
 * prompt, the commission maths); this is the whole set, and it always includes the
 * primary even on records saved before `platformIds` existed.
 */
export function tutorPlatforms(tutor: Tutor, custom: Platform[] = []): Platform[] {
  const ids = [tutor.platformId, ...(tutor.platformIds ?? [])].filter(Boolean);
  const unique = [...new Set(ids)];
  return unique.map((id) => platformOf(id, custom));
}

/** Does this tutor work on that platform? Used by the board and leaderboard filters. */
export function worksOnPlatform(tutor: Tutor, platformId: string): boolean {
  return tutor.platformId === platformId || (tutor.platformIds ?? []).includes(platformId);
}

/** Look a platform up, falling back to the custom entry rather than throwing. */
export function platformOf(id: string, custom: Platform[] = []): Platform {
  const all = [...custom, ...BUILTIN_PLATFORMS];
  return (
    all.find((p) => p.id === id) ??
    BUILTIN_PLATFORMS[BUILTIN_PLATFORMS.length - 1]
  );
}

/** All platforms, custom ones first so the mentor's own list reads as the main one. */
export function allPlatforms(custom: Platform[] = []): Platform[] {
  return [...custom, ...BUILTIN_PLATFORMS];
}

/** A readable text block describing the platform, embedded in every prompt. */
export function platformBrief(platform: Platform): string {
  return [
    `PLATFORM: ${platform.name}`,
    `PROFILE FIELDS ON THIS PLATFORM: ${platform.accountFields.join("; ")}`,
    `PLATFORM RULES (obey all of them):`,
    ...platform.rules.map((r) => `- ${r.label}: ${r.detail}`),
  ].join("\n");
}
