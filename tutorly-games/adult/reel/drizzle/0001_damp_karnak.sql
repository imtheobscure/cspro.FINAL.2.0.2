CREATE TABLE "discovery_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"title_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"external_id" text NOT NULL,
	"episode_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"poster" text,
	"license_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_imports_title_id_unique" UNIQUE("title_id")
);
--> statement-breakpoint
ALTER TABLE "discovery_imports" ADD CONSTRAINT "discovery_imports_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_imports" ADD CONSTRAINT "discovery_imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discovery_imports_provider_idx" ON "discovery_imports" USING btree ("provider_id","external_id");