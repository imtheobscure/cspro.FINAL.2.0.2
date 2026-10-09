CREATE TABLE "activity_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"activity_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"answer" jsonb,
	"correct" boolean,
	"score" integer DEFAULT 0 NOT NULL,
	"time_spent" integer DEFAULT 0 NOT NULL,
	"video_timestamp" real,
	"feedback_shown" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"rarity" text NOT NULL,
	"description" text NOT NULL,
	"condition" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"episode_id" text NOT NULL,
	"time" real NOT NULL,
	"note" text,
	"cue_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"episode_id" text NOT NULL,
	"type" text DEFAULT 'scene' NOT NULL,
	"title" text NOT NULL,
	"start_time" real NOT NULL,
	"end_time" real NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"language" text NOT NULL,
	"target_language" text NOT NULL,
	"level" text NOT NULL,
	"thumbnail" text,
	"accent" text DEFAULT 'violet' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"season_id" text NOT NULL,
	"episode_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"thumbnail" text,
	"poster" text,
	"duration" real DEFAULT 0 NOT NULL,
	"release_date" text,
	"language" text NOT NULL,
	"target_language" text NOT NULL,
	"license" text,
	"attribution" text
);
--> statement-breakpoint
CREATE TABLE "grammar_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"level" text DEFAULT 'B1' NOT NULL,
	"examples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_lesson_id" text,
	"source_episode_id" text,
	"mastery" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'introduced' NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"incorrect_count" integer DEFAULT 0 NOT NULL,
	"last_practiced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "learner_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"cefr_level" text DEFAULT 'B1' NOT NULL,
	"native_language" text DEFAULT 'Spanish' NOT NULL,
	"target_language" text DEFAULT 'English' NOT NULL,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weaknesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"onboarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learner_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "learning_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"lesson_id" text,
	"episode_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"segment_id" text NOT NULL,
	"activity_key" text NOT NULL,
	"type" text NOT NULL,
	"timestamp" real NOT NULL,
	"title" text NOT NULL,
	"points" integer NOT NULL,
	"difficulty" text NOT NULL,
	"required_for_next" boolean DEFAULT false NOT NULL,
	"content" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"current_segment" text,
	"current_activity" text,
	"video_position" real DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"percentage" real DEFAULT 0 NOT NULL,
	"activities_completed" integer DEFAULT 0 NOT NULL,
	"activities_correct" integer DEFAULT 0 NOT NULL,
	"time_spent" integer DEFAULT 0 NOT NULL,
	"activity_states" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"segment_key" text NOT NULL,
	"title" text NOT NULL,
	"start_time" real NOT NULL,
	"end_time" real NOT NULL,
	"focus" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"caption" text,
	"alt_text" text,
	"source_url" text,
	"license" text,
	"lesson_id" text,
	"episode_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pronunciation_targets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"examples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_episode_id" text,
	"source_lesson_id" text,
	"mastery" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'introduced' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_practiced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"authorization_type" text NOT NULL,
	"base_url" text,
	"license_url" text,
	"supports_download" boolean DEFAULT false NOT NULL,
	CONSTRAINT "providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" text PRIMARY KEY NOT NULL,
	"series_id" text NOT NULL,
	"season_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"thumbnail" text
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"thumbnail" text,
	"language" text NOT NULL,
	"target_language" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "series_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "skip_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"episode_id" text NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"start_time" real NOT NULL,
	"end_time" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subtitle_cues" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"cue_index" integer NOT NULL,
	"start_time" real NOT NULL,
	"end_time" real NOT NULL,
	"text" text NOT NULL,
	"speaker" text,
	"chapter_id" text
);
--> statement-breakpoint
CREATE TABLE "subtitle_tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"episode_id" text NOT NULL,
	"language" text NOT NULL,
	"label" text NOT NULL,
	"type" text DEFAULT 'original' NOT NULL,
	"source" text NOT NULL,
	"source_url" text,
	"format" text DEFAULT 'vtt' NOT NULL,
	"alignment" text DEFAULT 'cue' NOT NULL,
	"is_original" boolean DEFAULT false NOT NULL,
	"is_translation" boolean DEFAULT false NOT NULL,
	"is_forced" boolean DEFAULT false NOT NULL,
	"available" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subtitle_words" (
	"id" serial PRIMARY KEY NOT NULL,
	"cue_id" text NOT NULL,
	"word_index" integer NOT NULL,
	"text" text NOT NULL,
	"start_time" real NOT NULL,
	"end_time" real NOT NULL,
	"confidence" real,
	"speaker" text
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"badge_id" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_player_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subtitle_mode" text DEFAULT 'dual' NOT NULL,
	"playback_rate" real DEFAULT 1 NOT NULL,
	"quality" text DEFAULT 'auto' NOT NULL,
	"volume" real DEFAULT 1 NOT NULL,
	"auto_skip_intro" boolean DEFAULT false NOT NULL,
	"auto_skip_recap" boolean DEFAULT false NOT NULL,
	"auto_skip_outro" boolean DEFAULT false NOT NULL,
	"auto_skip_credits" boolean DEFAULT false NOT NULL,
	"autoplay_next" boolean DEFAULT true NOT NULL,
	"subtitle_font_size" text DEFAULT 'md' NOT NULL,
	"subtitle_background" boolean DEFAULT true NOT NULL,
	"theater_mode" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_player_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_streaks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"current_daily" integer DEFAULT 0 NOT NULL,
	"longest_daily" integer DEFAULT 0 NOT NULL,
	"last_active_date" text,
	"correct_streak" integer DEFAULT 0 NOT NULL,
	"best_correct_streak" integer DEFAULT 0 NOT NULL,
	"lesson_streak" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_streaks_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"avatar_color" text DEFAULT '#8b5cf6' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "video_lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"episode_id" text,
	"course_id" text,
	"series_id" text,
	"season_id" text,
	"title" text NOT NULL,
	"lesson_type" text DEFAULT 'videoLessonInteractive' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"cefr_level" text NOT NULL,
	"target_language" text NOT NULL,
	"native_language" text NOT NULL,
	"estimated_duration_seconds" integer DEFAULT 0 NOT NULL,
	"generated_by" text DEFAULT 'manual' NOT NULL,
	"for_user_id" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"episode_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"quality" text DEFAULT 'auto' NOT NULL,
	"width" integer,
	"height" integer,
	"bitrate" integer,
	"qualities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"audio_tracks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"availability" text DEFAULT 'FREE' NOT NULL,
	"authorization_type" text NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"downloadable" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"word" text NOT NULL,
	"lemma" text NOT NULL,
	"language" text NOT NULL,
	"translation" text,
	"definition" text,
	"part_of_speech" text,
	"cefr" text,
	"frequency" text,
	"pronunciation" text,
	"ipa" text,
	"example" text,
	"source_episode_id" text,
	"source_timestamp" real,
	"source_cue_id" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"next_review_at" timestamp with time zone,
	"mastery" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"interval_days" real DEFAULT 0 NOT NULL,
	"ease_factor" real DEFAULT 2.5 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watch_parties" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"episode_id" text NOT NULL,
	"host_user_id" text NOT NULL,
	"mode" text DEFAULT 'host' NOT NULL,
	"is_playing" boolean DEFAULT false NOT NULL,
	"current_time" real DEFAULT 0 NOT NULL,
	"playback_rate" real DEFAULT 1 NOT NULL,
	"subtitle_track_id" text,
	"server_timestamp" bigint DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watch_parties_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "watch_party_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"party_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'participant' NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watch_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"episode_id" text NOT NULL,
	"position" real DEFAULT 0 NOT NULL,
	"duration" real DEFAULT 0 NOT NULL,
	"percentage" real DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"last_subtitle_id" text,
	"last_chapter_id" text,
	"last_watched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_attempts" ADD CONSTRAINT "activity_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grammar_items" ADD CONSTRAINT "grammar_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD CONSTRAINT "learner_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_history" ADD CONSTRAINT "learning_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_activities" ADD CONSTRAINT "lesson_activities_lesson_id_video_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."video_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_activities" ADD CONSTRAINT "lesson_activities_segment_id_lesson_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."lesson_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_video_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."video_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_segments" ADD CONSTRAINT "lesson_segments_lesson_id_video_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."video_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pronunciation_targets" ADD CONSTRAINT "pronunciation_targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skip_segments" ADD CONSTRAINT "skip_segments_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtitle_cues" ADD CONSTRAINT "subtitle_cues_track_id_subtitle_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."subtitle_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtitle_tracks" ADD CONSTRAINT "subtitle_tracks_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtitle_words" ADD CONSTRAINT "subtitle_words_cue_id_subtitle_cues_id_fk" FOREIGN KEY ("cue_id") REFERENCES "public"."subtitle_cues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_player_preferences" ADD CONSTRAINT "user_player_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_lessons" ADD CONSTRAINT "video_lessons_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_sources" ADD CONSTRAINT "video_sources_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_sources" ADD CONSTRAINT "video_sources_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_items" ADD CONSTRAINT "vocabulary_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_parties" ADD CONSTRAINT "watch_parties_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_parties" ADD CONSTRAINT "watch_parties_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_party_participants" ADD CONSTRAINT "watch_party_participants_party_id_watch_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."watch_parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_party_participants" ADD CONSTRAINT "watch_party_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_attempts_user_idx" ON "activity_attempts" USING btree ("user_id","lesson_id");--> statement-breakpoint
CREATE INDEX "activity_attempts_activity_idx" ON "activity_attempts" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "bookmarks_user_idx" ON "bookmarks" USING btree ("user_id","episode_id");--> statement-breakpoint
CREATE INDEX "chapters_episode_idx" ON "chapters" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "episodes_season_idx" ON "episodes" USING btree ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grammar_user_slug_idx" ON "grammar_items" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "learning_history_user_idx" ON "learning_history" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "lesson_activities_lesson_idx" ON "lesson_activities" USING btree ("lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_progress_user_lesson_idx" ON "lesson_progress" USING btree ("user_id","lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_segments_lesson_idx" ON "lesson_segments" USING btree ("lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pron_user_slug_idx" ON "pronunciation_targets" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "seasons_series_idx" ON "seasons" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "series_course_idx" ON "series" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "skip_segments_episode_idx" ON "skip_segments" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "subtitle_cues_track_idx" ON "subtitle_cues" USING btree ("track_id","cue_index");--> statement-breakpoint
CREATE INDEX "subtitle_tracks_episode_idx" ON "subtitle_tracks" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "subtitle_words_cue_idx" ON "subtitle_words" USING btree ("cue_id","word_index");--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_unique_idx" ON "user_badges" USING btree ("user_id","badge_id");--> statement-breakpoint
CREATE INDEX "video_lessons_episode_idx" ON "video_lessons" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "video_sources_episode_idx" ON "video_sources" USING btree ("episode_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vocab_user_lemma_idx" ON "vocabulary_items" USING btree ("user_id","lemma","language");--> statement-breakpoint
CREATE UNIQUE INDEX "party_participants_unique_idx" ON "watch_party_participants" USING btree ("party_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "watch_progress_user_episode_idx" ON "watch_progress" USING btree ("user_id","episode_id");