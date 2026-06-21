CREATE TYPE "public"."ai_context_type" AS ENUM('general', 'facturacion', 'campanas', 'talentos', 'marcas', 'finanzas');--> statement-breakpoint
CREATE TYPE "public"."ai_message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."ai_tool_execution_status" AS ENUM('success', 'error', 'blocked');--> statement-breakpoint
CREATE TABLE "ai_assistant_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"role" "ai_message_role" NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_assistant_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'Nueva conversación' NOT NULL,
	"user_id" text NOT NULL,
	"context_type" "ai_context_type" DEFAULT 'general',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_tool_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"message_id" integer,
	"tool_name" text NOT NULL,
	"input_json" jsonb,
	"output_json" jsonb,
	"status" "ai_tool_execution_status" DEFAULT 'success' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_assistant_messages" ADD CONSTRAINT "ai_assistant_messages_thread_id_ai_assistant_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."ai_assistant_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_assistant_threads" ADD CONSTRAINT "ai_assistant_threads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_executions" ADD CONSTRAINT "ai_tool_executions_thread_id_ai_assistant_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."ai_assistant_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_executions" ADD CONSTRAINT "ai_tool_executions_message_id_ai_assistant_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_assistant_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_messages_thread_idx" ON "ai_assistant_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "ai_messages_thread_created_idx" ON "ai_assistant_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_threads_user_idx" ON "ai_assistant_threads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_threads_created_idx" ON "ai_assistant_threads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_tool_exec_thread_idx" ON "ai_tool_executions" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "ai_tool_exec_created_idx" ON "ai_tool_executions" USING btree ("created_at");