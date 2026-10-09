import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  jsonb,
  timestamp,
  bigint,
  index,
  uniqueIndex,
  serial,
} from "drizzle-orm/pg-core";
import type { VideoLesson, ActivityType, SegmentFocus } from "@/modules/lessons/types";

/* ------------------------------------------------------------------ */
/* Identity & learner                                                  */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  avatarColor: text("avatar_color").notNull().default("#8b5cf6"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export type LearnerPreferences = {
  feedbackDetail?: "normal" | "detailed";
  suspenseSounds?: boolean;
  activityPauseMode?: "pause" | "overlay";
  dailyGoalXp?: number;
};

export const learnerProfiles = pgTable("learner_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  cefrLevel: text("cefr_level").notNull().default("B1"),
  nativeLanguage: text("native_language").notNull().default("Spanish"),
  targetLanguage: text("target_language").notNull().default("English"),
  goals: jsonb("goals").$type<string[]>().notNull().default([]),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  facts: jsonb("facts").$type<string[]>().notNull().default([]),
  preferences: jsonb("preferences").$type<LearnerPreferences>().notNull().default({}),
  strengths: jsonb("strengths").$type<string[]>().notNull().default([]),
  weaknesses: jsonb("weaknesses").$type<string[]>().notNull().default([]),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  onboarded: boolean("onboarded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userStreaks = pgTable("user_streaks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  currentDaily: integer("current_daily").notNull().default(0),
  longestDaily: integer("longest_daily").notNull().default(0),
  lastActiveDate: text("last_active_date"),
  correctStreak: integer("correct_streak").notNull().default(0),
  bestCorrectStreak: integer("best_correct_streak").notNull().default(0),
  lessonStreak: integer("lesson_streak").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPlayerPreferences = pgTable("user_player_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  subtitleMode: text("subtitle_mode").notNull().default("dual"), // off | original | translation | dual
  playbackRate: real("playback_rate").notNull().default(1),
  quality: text("quality").notNull().default("auto"),
  volume: real("volume").notNull().default(1),
  autoSkipIntro: boolean("auto_skip_intro").notNull().default(false),
  autoSkipRecap: boolean("auto_skip_recap").notNull().default(false),
  autoSkipOutro: boolean("auto_skip_outro").notNull().default(false),
  autoSkipCredits: boolean("auto_skip_credits").notNull().default(false),
  autoplayNext: boolean("autoplay_next").notNull().default(true),
  subtitleFontSize: text("subtitle_font_size").notNull().default("md"),
  subtitleBackground: boolean("subtitle_background").notNull().default(true),
  theaterMode: boolean("theater_mode").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export const providers = pgTable("providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  priority: integer("priority").notNull().default(100),
  authorizationType: text("authorization_type").notNull(), // OWNED | LICENSED | PUBLIC_DOMAIN | CREATIVE_COMMONS | OFFICIAL_API | OFFICIAL_EMBED ...
  baseUrl: text("base_url"),
  licenseUrl: text("license_url"),
  supportsDownload: boolean("supports_download").notNull().default(false),
});

export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  language: text("language").notNull(),
  targetLanguage: text("target_language").notNull(),
  level: text("level").notNull(),
  thumbnail: text("thumbnail"),
  accent: text("accent").notNull().default("violet"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const series = pgTable(
  "series",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    thumbnail: text("thumbnail"),
    language: text("language").notNull(),
    targetLanguage: text("target_language").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("series_course_idx").on(t.courseId)],
);

export const seasons = pgTable(
  "seasons",
  {
    id: text("id").primaryKey(),
    seriesId: text("series_id").notNull().references(() => series.id, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    thumbnail: text("thumbnail"),
  },
  (t) => [index("seasons_series_idx").on(t.seriesId)],
);

export const episodes = pgTable(
  "episodes",
  {
    id: text("id").primaryKey(),
    seasonId: text("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
    episodeNumber: integer("episode_number").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    thumbnail: text("thumbnail"),
    poster: text("poster"),
    duration: real("duration").notNull().default(0),
    releaseDate: text("release_date"),
    language: text("language").notNull(),
    targetLanguage: text("target_language").notNull(),
    license: text("license"),
    attribution: text("attribution"),
  },
  (t) => [index("episodes_season_idx").on(t.seasonId)],
);

export type QualityOption = { label: string; url: string; height: number; bitrate?: number };

export const videoSources = pgTable(
  "video_sources",
  {
    id: text("id").primaryKey(),
    episodeId: text("episode_id").notNull().references(() => episodes.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull().references(() => providers.id),
    label: text("label").notNull(),
    url: text("url").notNull(),
    type: text("type").notNull(), // mp4 | hls | dash
    quality: text("quality").notNull().default("auto"),
    width: integer("width"),
    height: integer("height"),
    bitrate: integer("bitrate"),
    qualities: jsonb("qualities").$type<QualityOption[]>().notNull().default([]),
    audioTracks: jsonb("audio_tracks").$type<{ id: string; language: string; label: string }[]>().notNull().default([]),
    availability: text("availability").notNull().default("FREE"),
    authorizationType: text("authorization_type").notNull(),
    priority: integer("priority").notNull().default(100),
    downloadable: boolean("downloadable").notNull().default(false),
  },
  (t) => [index("video_sources_episode_idx").on(t.episodeId)],
);

export const chapters = pgTable(
  "chapters",
  {
    id: text("id").primaryKey(),
    episodeId: text("episode_id").notNull().references(() => episodes.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("scene"), // intro | recap | scene | main | outro | credits | custom
    title: text("title").notNull(),
    startTime: real("start_time").notNull(),
    endTime: real("end_time").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("chapters_episode_idx").on(t.episodeId)],
);

export const skipSegments = pgTable(
  "skip_segments",
  {
    id: text("id").primaryKey(),
    episodeId: text("episode_id").notNull().references(() => episodes.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // intro | recap | outro | credits | custom
    label: text("label").notNull(),
    startTime: real("start_time").notNull(),
    endTime: real("end_time").notNull(),
  },
  (t) => [index("skip_segments_episode_idx").on(t.episodeId)],
);

/* ------------------------------------------------------------------ */
/* Subtitles                                                           */
/* ------------------------------------------------------------------ */

export const subtitleTracks = pgTable(
  "subtitle_tracks",
  {
    id: text("id").primaryKey(),
    episodeId: text("episode_id").notNull().references(() => episodes.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    label: text("label").notNull(),
    type: text("type").notNull().default("original"), // original | translation | forced
    source: text("source").notNull(), // e.g. "official-vtt", "whisperx", "manual"
    sourceUrl: text("source_url"),
    format: text("format").notNull().default("vtt"),
    alignment: text("alignment").notNull().default("cue"), // word | estimated | cue
    isOriginal: boolean("is_original").notNull().default(false),
    isTranslation: boolean("is_translation").notNull().default(false),
    isForced: boolean("is_forced").notNull().default(false),
    available: boolean("available").notNull().default(true),
  },
  (t) => [index("subtitle_tracks_episode_idx").on(t.episodeId)],
);

export const subtitleCues = pgTable(
  "subtitle_cues",
  {
    id: text("id").primaryKey(),
    trackId: text("track_id").notNull().references(() => subtitleTracks.id, { onDelete: "cascade" }),
    cueIndex: integer("cue_index").notNull(),
    startTime: real("start_time").notNull(),
    endTime: real("end_time").notNull(),
    text: text("text").notNull(),
    speaker: text("speaker"),
    chapterId: text("chapter_id"),
  },
  (t) => [index("subtitle_cues_track_idx").on(t.trackId, t.cueIndex)],
);

export const subtitleWords = pgTable(
  "subtitle_words",
  {
    id: serial("id").primaryKey(),
    cueId: text("cue_id").notNull().references(() => subtitleCues.id, { onDelete: "cascade" }),
    wordIndex: integer("word_index").notNull(),
    text: text("text").notNull(),
    startTime: real("start_time").notNull(),
    endTime: real("end_time").notNull(),
    confidence: real("confidence"),
    speaker: text("speaker"),
  },
  (t) => [index("subtitle_words_cue_idx").on(t.cueId, t.wordIndex)],
);

/* ------------------------------------------------------------------ */
/* Watching                                                            */
/* ------------------------------------------------------------------ */

export const watchProgress = pgTable(
  "watch_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    episodeId: text("episode_id").notNull().references(() => episodes.id, { onDelete: "cascade" }),
    position: real("position").notNull().default(0),
    duration: real("duration").notNull().default(0),
    percentage: real("percentage").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    lastSubtitleId: text("last_subtitle_id"),
    lastChapterId: text("last_chapter_id"),
    lastWatchedAt: timestamp("last_watched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("watch_progress_user_episode_idx").on(t.userId, t.episodeId)],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    episodeId: text("episode_id").notNull().references(() => episodes.id, { onDelete: "cascade" }),
    time: real("time").notNull(),
    note: text("note"),
    cueId: text("cue_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bookmarks_user_idx").on(t.userId, t.episodeId)],
);

/* ------------------------------------------------------------------ */
/* Lessons                                                             */
/* ------------------------------------------------------------------ */

export const videoLessons = pgTable(
  "video_lessons",
  {
    id: text("id").primaryKey(),
    episodeId: text("episode_id").references(() => episodes.id, { onDelete: "cascade" }),
    courseId: text("course_id"),
    seriesId: text("series_id"),
    seasonId: text("season_id"),
    title: text("title").notNull(),
    lessonType: text("lesson_type").notNull().default("videoLessonInteractive"),
    status: text("status").notNull().default("published"), // draft | published
    cefrLevel: text("cefr_level").notNull(),
    targetLanguage: text("target_language").notNull(),
    nativeLanguage: text("native_language").notNull(),
    estimatedDurationSeconds: integer("estimated_duration_seconds").notNull().default(0),
    generatedBy: text("generated_by").notNull().default("manual"), // manual | ai | rules
    forUserId: text("for_user_id"),
    data: jsonb("data").$type<VideoLesson>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("video_lessons_episode_idx").on(t.episodeId)],
);

export const lessonSegments = pgTable(
  "lesson_segments",
  {
    id: text("id").primaryKey(), // `${lessonId}:${segmentKey}`
    lessonId: text("lesson_id").notNull().references(() => videoLessons.id, { onDelete: "cascade" }),
    segmentKey: text("segment_key").notNull(),
    title: text("title").notNull(),
    startTime: real("start_time").notNull(),
    endTime: real("end_time").notNull(),
    focus: jsonb("focus").$type<SegmentFocus>().notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("lesson_segments_lesson_idx").on(t.lessonId)],
);

export const lessonActivities = pgTable(
  "lesson_activities",
  {
    id: text("id").primaryKey(), // `${lessonId}:${activityKey}`
    lessonId: text("lesson_id").notNull().references(() => videoLessons.id, { onDelete: "cascade" }),
    segmentId: text("segment_id").notNull().references(() => lessonSegments.id, { onDelete: "cascade" }),
    activityKey: text("activity_key").notNull(),
    type: text("type").$type<ActivityType>().notNull(),
    timestamp: real("timestamp").notNull(),
    title: text("title").notNull(),
    points: integer("points").notNull(),
    difficulty: text("difficulty").notNull(),
    requiredForNext: boolean("required_for_next").notNull().default(false),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  },
  (t) => [index("lesson_activities_lesson_idx").on(t.lessonId)],
);

export type ActivityStateValue =
  | "not_started"
  | "active"
  | "answered"
  | "correct"
  | "incorrect"
  | "skipped"
  | "completed"
  | "locked";

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull().references(() => videoLessons.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("not_started"), // not_started | in_progress | paused | completed | abandoned
    currentSegment: text("current_segment"),
    currentActivity: text("current_activity"),
    videoPosition: real("video_position").notNull().default(0),
    score: integer("score").notNull().default(0),
    xp: integer("xp").notNull().default(0),
    percentage: real("percentage").notNull().default(0),
    activitiesCompleted: integer("activities_completed").notNull().default(0),
    activitiesCorrect: integer("activities_correct").notNull().default(0),
    timeSpent: integer("time_spent").notNull().default(0),
    activityStates: jsonb("activity_states").$type<Record<string, ActivityStateValue>>().notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("lesson_progress_user_lesson_idx").on(t.userId, t.lessonId)],
);

export const activityAttempts = pgTable(
  "activity_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull(),
    activityId: text("activity_id").notNull(),
    activityType: text("activity_type").notNull(),
    attemptNumber: integer("attempt_number").notNull().default(1),
    answer: jsonb("answer").$type<unknown>(),
    correct: boolean("correct"),
    score: integer("score").notNull().default(0),
    timeSpent: integer("time_spent").notNull().default(0),
    videoTimestamp: real("video_timestamp"),
    feedbackShown: text("feedback_shown"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_attempts_user_idx").on(t.userId, t.lessonId), index("activity_attempts_activity_idx").on(t.activityId)],
);

/* ------------------------------------------------------------------ */
/* Knowledge tracking                                                  */
/* ------------------------------------------------------------------ */

export const vocabularyItems = pgTable(
  "vocabulary_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    word: text("word").notNull(),
    lemma: text("lemma").notNull(),
    language: text("language").notNull(),
    translation: text("translation"),
    definition: text("definition"),
    partOfSpeech: text("part_of_speech"),
    cefr: text("cefr"),
    frequency: text("frequency"),
    pronunciation: text("pronunciation"),
    ipa: text("ipa"),
    example: text("example"),
    sourceEpisodeId: text("source_episode_id"),
    sourceTimestamp: real("source_timestamp"),
    sourceCueId: text("source_cue_id"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    mastery: integer("mastery").notNull().default(0), // 0-100
    status: text("status").notNull().default("new"), // new | learning | review | known | mastered | needsReview
    reviewCount: integer("review_count").notNull().default(0),
    intervalDays: real("interval_days").notNull().default(0),
    easeFactor: real("ease_factor").notNull().default(2.5),
  },
  (t) => [uniqueIndex("vocab_user_lemma_idx").on(t.userId, t.lemma, t.language)],
);

export const grammarItems = pgTable(
  "grammar_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    level: text("level").notNull().default("B1"),
    examples: jsonb("examples").$type<string[]>().notNull().default([]),
    sourceLessonId: text("source_lesson_id"),
    sourceEpisodeId: text("source_episode_id"),
    mastery: integer("mastery").notNull().default(0),
    status: text("status").notNull().default("introduced"), // introduced | practiced | mastered | needsReview
    correctCount: integer("correct_count").notNull().default(0),
    incorrectCount: integer("incorrect_count").notNull().default(0),
    lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("grammar_user_slug_idx").on(t.userId, t.slug)],
);

export const pronunciationTargets = pgTable(
  "pronunciation_targets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    target: text("target").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    examples: jsonb("examples").$type<string[]>().notNull().default([]),
    sourceEpisodeId: text("source_episode_id"),
    sourceLessonId: text("source_lesson_id"),
    mastery: integer("mastery").notNull().default(0),
    status: text("status").notNull().default("introduced"),
    attempts: integer("attempts").notNull().default(0),
    lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("pron_user_slug_idx").on(t.userId, t.slug)],
);

export const learningHistory = pgTable(
  "learning_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // lesson_started | lesson_completed | activity_attempt | vocab_saved | badge_earned | review
    lessonId: text("lesson_id"),
    episodeId: text("episode_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("learning_history_user_idx").on(t.userId, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Gamification                                                        */
/* ------------------------------------------------------------------ */

export type BadgeCondition =
  | { type: "activities_completed"; count: number }
  | { type: "activities_correct"; count: number }
  | { type: "vocab_saved"; count: number }
  | { type: "correct_streak"; count: number }
  | { type: "speaking_perfect"; count: number }
  | { type: "lessons_completed"; count: number }
  | { type: "episodes_completed"; count: number }
  | { type: "daily_streak"; count: number }
  | { type: "xp"; count: number }
  | { type: "watch_party_joined"; count: number };

export const badges = pgTable("badges", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  rarity: text("rarity").notNull(), // common | uncommon | rare | epic | legendary
  description: text("description").notNull(),
  condition: jsonb("condition").$type<BadgeCondition>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const userBadges = pgTable(
  "user_badges",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_badges_unique_idx").on(t.userId, t.badgeId)],
);

/* ------------------------------------------------------------------ */
/* Watch party                                                         */
/* ------------------------------------------------------------------ */

export const watchParties = pgTable("watch_parties", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  episodeId: text("episode_id").notNull().references(() => episodes.id, { onDelete: "cascade" }),
  hostUserId: text("host_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mode: text("mode").notNull().default("host"), // host | follow | independent
  isPlaying: boolean("is_playing").notNull().default(false),
  currentTime: real("current_time").notNull().default(0),
  playbackRate: real("playback_rate").notNull().default(1),
  subtitleTrackId: text("subtitle_track_id"),
  serverTimestamp: bigint("server_timestamp", { mode: "number" }).notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const watchPartyParticipants = pgTable(
  "watch_party_participants",
  {
    id: text("id").primaryKey(),
    partyId: text("party_id").notNull().references(() => watchParties.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("participant"), // host | cohost | participant
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("party_participants_unique_idx").on(t.partyId, t.userId)],
);

/* ------------------------------------------------------------------ */
/* Discovery                                                           */
/* ------------------------------------------------------------------ */

/**
 * Remembers which discovered catalog title became which episode, so the
 * discovery page can say “in your library” and never import the same film twice.
 */
export const discoveryImports = pgTable(
  "discovery_imports",
  {
    id: text("id").primaryKey(),
    /** `${providerId}:${externalId}` from the discovery service. */
    titleId: text("title_id").notNull().unique(),
    providerId: text("provider_id").notNull(),
    externalId: text("external_id").notNull(),
    episodeId: text("episode_id").notNull().references(() => episodes.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    poster: text("poster"),
    licenseLabel: text("license_label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("discovery_imports_provider_idx").on(t.providerId, t.externalId)],
);

/* ------------------------------------------------------------------ */
/* Media library                                                       */
/* ------------------------------------------------------------------ */

export const mediaAssets = pgTable("media_assets", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  type: text("type").notNull(), // image | youtube | audio | podcast | document | external
  caption: text("caption"),
  altText: text("alt_text"),
  sourceUrl: text("source_url"),
  license: text("license"),
  lessonId: text("lesson_id"),
  episodeId: text("episode_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type LearnerProfile = typeof learnerProfiles.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type VideoSource = typeof videoSources.$inferSelect;
export type SubtitleTrack = typeof subtitleTracks.$inferSelect;
export type SubtitleCue = typeof subtitleCues.$inferSelect;
export type SubtitleWord = typeof subtitleWords.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type SkipSegment = typeof skipSegments.$inferSelect;
export type WatchProgressRow = typeof watchProgress.$inferSelect;
export type VideoLessonRow = typeof videoLessons.$inferSelect;
export type LessonProgressRow = typeof lessonProgress.$inferSelect;
export type VocabularyItem = typeof vocabularyItems.$inferSelect;
export type GrammarItem = typeof grammarItems.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type PlayerPreferences = typeof userPlayerPreferences.$inferSelect;
export type WatchParty = typeof watchParties.$inferSelect;
export type DiscoveryImport = typeof discoveryImports.$inferSelect;
