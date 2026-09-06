CREATE TABLE "studio_profiles" (
	"talent_id" integer PRIMARY KEY NOT NULL,
	"document" jsonb NOT NULL,
	"recorded_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio_profiles" ADD CONSTRAINT "studio_profiles_talent_id_talents_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_profiles" ADD CONSTRAINT "studio_profiles_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;