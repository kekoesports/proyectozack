CREATE TYPE "public"."intake_channel" AS ENUM('telegram', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."intake_delivery" AS ENUM('pending', 'sending', 'accepted', 'uncertain', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."intake_state" AS ENUM('bot', 'waiting_human', 'human', 'closed');--> statement-breakpoint
CREATE TABLE "intake_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" "intake_channel" NOT NULL,
	"account_id" varchar(200) NOT NULL,
	"chat_id" varchar(100) NOT NULL,
	"state" "intake_state" DEFAULT 'bot' NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"qualification" varchar(40) DEFAULT 'pending' NOT NULL,
	"reason" varchar(200),
	"assigned_to" text,
	"version" integer DEFAULT 0 NOT NULL,
	"last_inbound_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"external_id" varchar(160) NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"actor" varchar(20) NOT NULL,
	"text" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"kind" varchar(20) NOT NULL,
	"conversation_version" integer NOT NULL,
	"text" text NOT NULL,
	"status" "intake_delivery" DEFAULT 'pending' NOT NULL,
	"receipt" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "intake_conversations" ADD CONSTRAINT "intake_conversations_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_messages" ADD CONSTRAINT "intake_messages_conversation_id_intake_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."intake_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_outbox" ADD CONSTRAINT "intake_outbox_conversation_id_intake_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."intake_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_outbox" ADD CONSTRAINT "intake_outbox_message_id_intake_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."intake_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "intake_conversation_identity_uq" ON "intake_conversations" USING btree ("channel","account_id","chat_id");--> statement-breakpoint
CREATE INDEX "intake_conversation_queue_idx" ON "intake_conversations" USING btree ("state","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "intake_message_identity_uq" ON "intake_messages" USING btree ("conversation_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intake_outbox_effect_uq" ON "intake_outbox" USING btree ("message_id","kind");