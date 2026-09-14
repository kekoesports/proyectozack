CREATE TABLE "intake_inbox" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"reason" varchar(80),
	"result" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "intake_peer_aliases" (
	"key" varchar(240) PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "intake_conversations" ADD COLUMN "canonical_id" uuid;--> statement-breakpoint
ALTER TABLE "intake_peer_aliases" ADD CONSTRAINT "intake_peer_aliases_conversation_id_intake_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."intake_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intake_inbox_queue_idx" ON "intake_inbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "intake_peer_alias_conversation_idx" ON "intake_peer_aliases" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "intake_conversation_canonical_idx" ON "intake_conversations" USING btree ("canonical_id");