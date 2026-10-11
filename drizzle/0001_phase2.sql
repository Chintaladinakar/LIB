CREATE TABLE "newsletter_sync" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"list_id" text NOT NULL,
	"api_key" text NOT NULL,
	"last_error" text,
	"last_synced_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_profile_email_key" UNIQUE("profile_id","email")
);
--> statement-breakpoint
CREATE TABLE "view_breakdowns" (
	"profile_id" uuid NOT NULL,
	"day" date NOT NULL,
	"dimension" text NOT NULL,
	"value" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "view_breakdowns_profile_id_day_dimension_value_pk" PRIMARY KEY("profile_id","day","dimension","value")
);
--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "kind" text DEFAULT 'link' NOT NULL;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "show_branding" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "custom_domain" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "domain_token" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "domain_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "newsletter_sync" ADD CONSTRAINT "newsletter_sync_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "view_breakdowns" ADD CONSTRAINT "view_breakdowns_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_custom_domain_unique" UNIQUE("custom_domain");