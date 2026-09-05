CREATE TABLE "creator_account_observations" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"run_id" integer NOT NULL,
	"fields" jsonb NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_daily_api_usage" (
	"platform" varchar(40) NOT NULL,
	"bucket_day" date NOT NULL,
	"budget_key" varchar(150) NOT NULL,
	"reserved_requests" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_daily_api_usage_platform_bucket_day_budget_key_pk" PRIMARY KEY("platform","bucket_day","budget_key")
);
--> statement-breakpoint
CREATE TABLE "creator_digest_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_key" varchar(120) NOT NULL,
	"run_id" integer,
	"content" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"channel_id" varchar(30) NOT NULL,
	"guild_id" varchar(30) NOT NULL,
	"message_id" varchar(30),
	"nonce" varchar(25) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator_account_observations" ADD CONSTRAINT "creator_account_observations_account_id_creator_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."creator_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_account_observations" ADD CONSTRAINT "creator_account_observations_run_id_creator_discovery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."creator_discovery_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_digest_outbox" ADD CONSTRAINT "creator_digest_outbox_run_id_creator_discovery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."creator_discovery_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creator_observation_account_run_key" ON "creator_account_observations" USING btree ("account_id","run_id");--> statement-breakpoint
CREATE INDEX "creator_observation_history_idx" ON "creator_account_observations" USING btree ("account_id","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_digest_event_key" ON "creator_digest_outbox" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "creator_digest_pending_idx" ON "creator_digest_outbox" USING btree ("status","available_at");