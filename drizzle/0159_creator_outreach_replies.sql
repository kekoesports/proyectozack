CREATE TABLE "creator_outreach_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"direction" varchar(12) NOT NULL,
	"status" varchar(32) NOT NULL,
	"provider_email_id" varchar(100),
	"internet_message_id" varchar(500),
	"idempotency_key" uuid,
	"subject" varchar(200) NOT NULL,
	"text_body" text NOT NULL,
	"actor_id" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_outreach_messages_provider_id_uniq" UNIQUE("provider_email_id"),
	CONSTRAINT "creator_outreach_messages_idempotency_uniq" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "creator_outreach_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"source_type" varchar(32) NOT NULL,
	"source_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_outreach_sources_type_id_uniq" UNIQUE("source_type","source_id")
);
--> statement-breakpoint
CREATE TABLE "creator_outreach_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"normalized_email" varchar(254) NOT NULL,
	"reply_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"unsubscribe_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"subject" varchar(200),
	"first_contact_at" timestamp with time zone,
	"last_outbound_at" timestamp with time zone,
	"last_inbound_at" timestamp with time zone,
	"next_follow_up_at" timestamp with time zone,
	"last_reply_summary" varchar(500),
	"suggested_reply" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_outreach_threads_email_uniq" UNIQUE("normalized_email"),
	CONSTRAINT "creator_outreach_threads_reply_token_uniq" UNIQUE("reply_token"),
	CONSTRAINT "creator_outreach_threads_unsubscribe_token_uniq" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
ALTER TABLE "creator_outreach_messages" ADD CONSTRAINT "creator_outreach_messages_thread_id_creator_outreach_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."creator_outreach_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_outreach_messages" ADD CONSTRAINT "creator_outreach_messages_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_outreach_sources" ADD CONSTRAINT "creator_outreach_sources_thread_id_creator_outreach_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."creator_outreach_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_outreach_messages_thread_date_idx" ON "creator_outreach_messages" USING btree ("thread_id","occurred_at");--> statement-breakpoint
CREATE INDEX "creator_outreach_sources_thread_idx" ON "creator_outreach_sources" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "creator_outreach_threads_status_followup_idx" ON "creator_outreach_threads" USING btree ("status","next_follow_up_at");