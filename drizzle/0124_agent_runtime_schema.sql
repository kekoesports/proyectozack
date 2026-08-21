-- Zack Agent OS — fundación persistente del runtime (PR 1).
--
-- Migración ADITIVA: 16 tipos enum y 10 tablas nuevas, todas con prefijo
-- `agent_`. Cero DROP, cero RENAME, cero TRUNCATE. No toca ninguna tabla
-- existente: `ai_assistant_threads`, `ai_assistant_messages` y
-- `ai_tool_executions` siguen intactas y /admin/asistente no se entera.
--
-- Aplicarla no activa nada. Los agentes se siembran en status=disabled y
-- mode=shadow, no hay ningún schedule con enabled=true y AGENTS_ENABLED vale
-- false por defecto. El worker llega en PR 3.
--
-- Rollback: funcional, no destructivo. AGENTS_ENABLED=false + agentes en
-- disabled + schedules en false + worker parado. Las tablas se quedan donde
-- están sin afectar al CRM. Ver docs/agent-os/pr1-runtime-schema.md.
--
-- Generada con `drizzle-kit generate`; el SQL se revisó statement a statement.
-- Ver docs/agent-os/data-model.md.

CREATE TYPE "public"."agent_action_class" AS ENUM('read', 'internal_draft', 'internal_write', 'external_side_effect', 'privileged', 'forbidden');--> statement-breakpoint
CREATE TYPE "public"."agent_approval_status" AS ENUM('pending', 'approved', 'rejected', 'expired', 'cancelled', 'consumed');--> statement-breakpoint
CREATE TYPE "public"."agent_event_severity" AS ENUM('info', 'warning', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."agent_event_status" AS ENUM('pending', 'claimed', 'processed', 'ignored', 'dead_letter');--> statement-breakpoint
CREATE TYPE "public"."agent_memory_scope" AS ENUM('user', 'team', 'agent', 'global');--> statement-breakpoint
CREATE TYPE "public"."agent_memory_sensitivity" AS ENUM('public', 'internal', 'confidential', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."agent_memory_verification" AS ENUM('proposed', 'verified', 'rejected', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."agent_mode" AS ENUM('shadow', 'recommend', 'execute');--> statement-breakpoint
CREATE TYPE "public"."agent_run_status" AS ENUM('queued', 'running', 'waiting_approval', 'retry_scheduled', 'succeeded', 'failed', 'cancelled', 'budget_blocked', 'dead_letter');--> statement-breakpoint
CREATE TYPE "public"."agent_schedule_catch_up" AS ENUM('skip', 'latest', 'all_limited');--> statement-breakpoint
CREATE TYPE "public"."agent_status" AS ENUM('active', 'paused', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."agent_step_status" AS ENUM('pending', 'running', 'waiting', 'succeeded', 'failed', 'skipped', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."agent_step_type" AS ENUM('deterministic', 'model', 'tool', 'approval', 'handoff', 'finalize');--> statement-breakpoint
CREATE TYPE "public"."agent_tool_call_status" AS ENUM('proposed', 'waiting_approval', 'approved', 'executing', 'succeeded', 'failed', 'blocked', 'rejected', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."agent_trigger_type" AS ENUM('manual', 'chat', 'schedule', 'event', 'webhook', 'system');--> statement-breakpoint
CREATE TYPE "public"."agent_usage_kind" AS ENUM('model_turn', 'embedding', 'external_api', 'tool_runtime');--> statement-breakpoint
CREATE TABLE "agent_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(80) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "agent_status" DEFAULT 'disabled' NOT NULL,
	"mode" "agent_mode" DEFAULT 'shadow' NOT NULL,
	"prompt_version" varchar(80) DEFAULT 'v0' NOT NULL,
	"policy_version" varchar(80) DEFAULT 'v0' NOT NULL,
	"model_provider" varchar(40) DEFAULT 'null' NOT NULL,
	"model_name" varchar(120),
	"max_concurrent_runs" integer DEFAULT 1 NOT NULL,
	"max_runs_per_day" integer DEFAULT 24 NOT NULL,
	"max_turns_per_run" integer DEFAULT 8 NOT NULL,
	"max_tool_calls_per_run" integer DEFAULT 16 NOT NULL,
	"max_duration_seconds" integer DEFAULT 600 NOT NULL,
	"monthly_budget_micros" bigint DEFAULT 0 NOT NULL,
	"settings_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_definitions_concurrency_ck" CHECK ("agent_definitions"."max_concurrent_runs" > 0),
	CONSTRAINT "agent_definitions_runs_per_day_ck" CHECK ("agent_definitions"."max_runs_per_day" > 0),
	CONSTRAINT "agent_definitions_turns_ck" CHECK ("agent_definitions"."max_turns_per_run" > 0),
	CONSTRAINT "agent_definitions_tool_calls_ck" CHECK ("agent_definitions"."max_tool_calls_per_run" > 0),
	CONSTRAINT "agent_definitions_duration_ck" CHECK ("agent_definitions"."max_duration_seconds" > 0),
	CONSTRAINT "agent_definitions_budget_ck" CHECK ("agent_definitions"."monthly_budget_micros" >= 0)
);
--> statement-breakpoint
CREATE TABLE "agent_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(80) NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"external_id" varchar(240),
	"event_key" varchar(320) NOT NULL,
	"severity" "agent_event_severity" DEFAULT 'info' NOT NULL,
	"status" "agent_event_status" DEFAULT 'pending' NOT NULL,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fingerprint" varchar(160),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_by" varchar(120),
	"claim_expires_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"attempt" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_events_attempt_ck" CHECK ("agent_events"."attempt" >= 0)
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"trigger_type" "agent_trigger_type" NOT NULL,
	"triggered_by_user_id" text,
	"parent_run_id" integer,
	"source_event_id" integer,
	"thread_id" integer,
	"status" "agent_run_status" DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"idempotency_key" varchar(240),
	"correlation_id" varchar(80) NOT NULL,
	"input_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output_summary" text,
	"state_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scheduled_for" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancel_requested_at" timestamp with time zone,
	"attempt" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"lease_owner" varchar(120),
	"lease_expires_at" timestamp with time zone,
	"next_step_sequence" integer DEFAULT 0 NOT NULL,
	"model_turns" integer DEFAULT 0 NOT NULL,
	"tool_calls" integer DEFAULT 0 NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"estimated_cost_micros" bigint DEFAULT 0 NOT NULL,
	"last_error_code" varchar(100),
	"last_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_runs_attempt_ck" CHECK ("agent_runs"."attempt" >= 0 AND "agent_runs"."attempt" <= "agent_runs"."max_attempts"),
	CONSTRAINT "agent_runs_max_attempts_ck" CHECK ("agent_runs"."max_attempts" > 0),
	CONSTRAINT "agent_runs_counters_ck" CHECK ("agent_runs"."model_turns" >= 0 AND "agent_runs"."tool_calls" >= 0 AND "agent_runs"."input_tokens" >= 0 AND "agent_runs"."output_tokens" >= 0 AND "agent_runs"."estimated_cost_micros" >= 0 AND "agent_runs"."next_step_sequence" >= 0),
	CONSTRAINT "agent_runs_terminal_completed_ck" CHECK ("agent_runs"."status" NOT IN ('succeeded', 'failed', 'cancelled', 'budget_blocked', 'dead_letter') OR "agent_runs"."completed_at" IS NOT NULL),
	CONSTRAINT "agent_runs_running_lease_ck" CHECK ("agent_runs"."status" <> 'running' OR ("agent_runs"."lease_owner" IS NOT NULL AND "agent_runs"."lease_expires_at" IS NOT NULL)),
	CONSTRAINT "agent_runs_waiting_no_lease_ck" CHECK ("agent_runs"."status" <> 'waiting_approval' OR "agent_runs"."lease_owner" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "agent_run_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"sequence" integer NOT NULL,
	"step_type" "agent_step_type" NOT NULL,
	"name" varchar(160) NOT NULL,
	"status" "agent_step_status" DEFAULT 'pending' NOT NULL,
	"input_json" jsonb,
	"output_json" jsonb,
	"provider" varchar(40),
	"model" varchar(120),
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"estimated_cost_micros" bigint DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_code" varchar(100),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_run_steps_sequence_ck" CHECK ("agent_run_steps"."sequence" >= 0),
	CONSTRAINT "agent_run_steps_counters_ck" CHECK ("agent_run_steps"."input_tokens" >= 0 AND "agent_run_steps"."output_tokens" >= 0 AND "agent_run_steps"."estimated_cost_micros" >= 0)
);
--> statement-breakpoint
CREATE TABLE "agent_tool_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"step_id" integer,
	"provider_call_id" varchar(160),
	"tool_name" varchar(160) NOT NULL,
	"tool_version" varchar(80) NOT NULL,
	"action_class" "agent_action_class" NOT NULL,
	"status" "agent_tool_call_status" DEFAULT 'proposed' NOT NULL,
	"input_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"input_hash" varchar(64) NOT NULL,
	"idempotency_key" varchar(240),
	"result_json" jsonb,
	"error_code" varchar(100),
	"error_message" text,
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"executed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_tool_calls_input_hash_ck" CHECK (char_length("agent_tool_calls"."input_hash") = 64)
);
--> statement-breakpoint
CREATE TABLE "agent_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"tool_call_id" integer NOT NULL,
	"action_hash" varchar(64) NOT NULL,
	"action_class" "agent_action_class" NOT NULL,
	"risk_level" varchar(20) DEFAULT 'medium' NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"parameters_preview_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "agent_approval_status" DEFAULT 'pending' NOT NULL,
	"required_permission_module" varchar(80),
	"required_permission_action" varchar(80),
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by_user_id" text,
	"decision_note" text,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_approvals_action_hash_ck" CHECK (char_length("agent_approvals"."action_hash") = 64),
	CONSTRAINT "agent_approvals_expiry_ck" CHECK ("agent_approvals"."expires_at" > "agent_approvals"."requested_at"),
	CONSTRAINT "agent_approvals_risk_ck" CHECK ("agent_approvals"."risk_level" IN ('low', 'medium', 'high', 'critical')),
	CONSTRAINT "agent_approvals_not_forbidden_ck" CHECK ("agent_approvals"."action_class" <> 'forbidden'),
	CONSTRAINT "agent_approvals_decided_ck" CHECK ("agent_approvals"."status" NOT IN ('approved', 'rejected') OR ("agent_approvals"."decided_at" IS NOT NULL AND "agent_approvals"."decided_by_user_id" IS NOT NULL)),
	CONSTRAINT "agent_approvals_consumed_ck" CHECK ("agent_approvals"."status" <> 'consumed' OR "agent_approvals"."consumed_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "agent_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"agent_id" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"cron_expression" varchar(120) NOT NULL,
	"timezone" varchar(80) DEFAULT 'Europe/Madrid' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"catch_up_policy" "agent_schedule_catch_up" DEFAULT 'skip' NOT NULL,
	"max_catch_up_runs" integer DEFAULT 1 NOT NULL,
	"input_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"next_run_at" timestamp with time zone,
	"last_scheduled_for" timestamp with time zone,
	"last_run_id" integer,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_schedules_catch_up_ck" CHECK ("agent_schedules"."max_catch_up_runs" > 0),
	CONSTRAINT "agent_schedules_enabled_next_ck" CHECK ("agent_schedules"."enabled" = false OR "agent_schedules"."next_run_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "agent_memories" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" "agent_memory_scope" NOT NULL,
	"scope_user_id" text,
	"agent_id" integer,
	"memory_key" varchar(180) NOT NULL,
	"content" text NOT NULL,
	"content_json" jsonb,
	"sensitivity" "agent_memory_sensitivity" DEFAULT 'internal' NOT NULL,
	"verification_status" "agent_memory_verification" DEFAULT 'proposed' NOT NULL,
	"confidence_pct" integer,
	"source_type" varchar(80) NOT NULL,
	"source_ref" text,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"supersedes_memory_id" integer,
	"created_by_user_id" text,
	"verified_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_memories_user_scope_ck" CHECK ("agent_memories"."scope" <> 'user' OR "agent_memories"."scope_user_id" IS NOT NULL),
	CONSTRAINT "agent_memories_agent_scope_ck" CHECK ("agent_memories"."scope" <> 'agent' OR "agent_memories"."agent_id" IS NOT NULL),
	CONSTRAINT "agent_memories_confidence_ck" CHECK ("agent_memories"."confidence_pct" IS NULL OR ("agent_memories"."confidence_pct" >= 0 AND "agent_memories"."confidence_pct" <= 100)),
	CONSTRAINT "agent_memories_validity_ck" CHECK ("agent_memories"."valid_until" IS NULL OR "agent_memories"."valid_until" > "agent_memories"."valid_from"),
	CONSTRAINT "agent_memories_verified_by_ck" CHECK ("agent_memories"."verification_status" <> 'verified' OR "agent_memories"."verified_by_user_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "agent_usage_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"step_id" integer,
	"agent_id" integer NOT NULL,
	"kind" "agent_usage_kind" NOT NULL,
	"provider" varchar(40),
	"model" varchar(120),
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"cached_input_tokens" bigint,
	"estimated_cost_micros" bigint DEFAULT 0 NOT NULL,
	"pricing_unknown" boolean DEFAULT false NOT NULL,
	"duration_ms" integer,
	"usage_json" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_usage_counters_ck" CHECK ("agent_usage_ledger"."input_tokens" >= 0 AND "agent_usage_ledger"."output_tokens" >= 0 AND "agent_usage_ledger"."estimated_cost_micros" >= 0)
);
--> statement-breakpoint
CREATE TABLE "agent_worker_heartbeats" (
	"worker_id" varchar(120) PRIMARY KEY NOT NULL,
	"version" varchar(80) DEFAULT 'unknown' NOT NULL,
	"hostname" varchar(160) DEFAULT 'unknown' NOT NULL,
	"status" varchar(30) DEFAULT 'starting' NOT NULL,
	"current_run_id" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "agent_worker_heartbeats_status_ck" CHECK ("agent_worker_heartbeats"."status" IN ('starting', 'healthy', 'draining', 'stopped'))
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_agent_id_agent_definitions_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_triggered_by_user_id_user_id_fk" FOREIGN KEY ("triggered_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_parent_run_id_agent_runs_id_fk" FOREIGN KEY ("parent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_source_event_id_agent_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."agent_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_thread_id_ai_assistant_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."ai_assistant_threads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_run_steps" ADD CONSTRAINT "agent_run_steps_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tool_calls" ADD CONSTRAINT "agent_tool_calls_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tool_calls" ADD CONSTRAINT "agent_tool_calls_step_id_agent_run_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."agent_run_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_approvals" ADD CONSTRAINT "agent_approvals_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_approvals" ADD CONSTRAINT "agent_approvals_tool_call_id_agent_tool_calls_id_fk" FOREIGN KEY ("tool_call_id") REFERENCES "public"."agent_tool_calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_approvals" ADD CONSTRAINT "agent_approvals_decided_by_user_id_user_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_schedules" ADD CONSTRAINT "agent_schedules_agent_id_agent_definitions_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_schedules" ADD CONSTRAINT "agent_schedules_last_run_id_agent_runs_id_fk" FOREIGN KEY ("last_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_schedules" ADD CONSTRAINT "agent_schedules_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_scope_user_id_user_id_fk" FOREIGN KEY ("scope_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_agent_id_agent_definitions_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_supersedes_memory_id_agent_memories_id_fk" FOREIGN KEY ("supersedes_memory_id") REFERENCES "public"."agent_memories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_verified_by_user_id_user_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_usage_ledger" ADD CONSTRAINT "agent_usage_ledger_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_usage_ledger" ADD CONSTRAINT "agent_usage_ledger_step_id_agent_run_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."agent_run_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_usage_ledger" ADD CONSTRAINT "agent_usage_ledger_agent_id_agent_definitions_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_worker_heartbeats" ADD CONSTRAINT "agent_worker_heartbeats_current_run_id_agent_runs_id_fk" FOREIGN KEY ("current_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_definitions_slug_uq" ON "agent_definitions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "agent_definitions_status_idx" ON "agent_definitions" USING btree ("status","mode");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_events_event_key_uq" ON "agent_events" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "agent_events_pending_idx" ON "agent_events" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "agent_events_fingerprint_idx" ON "agent_events" USING btree ("fingerprint","occurred_at");--> statement-breakpoint
CREATE INDEX "agent_events_source_type_idx" ON "agent_events" USING btree ("source","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "agent_events_severity_idx" ON "agent_events" USING btree ("severity","status","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_runs_idempotency_key_uq" ON "agent_runs" USING btree ("idempotency_key") WHERE idempotency_key IS NOT NULL;--> statement-breakpoint
CREATE INDEX "agent_runs_claimable_idx" ON "agent_runs" USING btree ("status","available_at","priority") WHERE status IN ('queued', 'retry_scheduled');--> statement-breakpoint
CREATE INDEX "agent_runs_agent_created_idx" ON "agent_runs" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_runs_user_created_idx" ON "agent_runs" USING btree ("triggered_by_user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_runs_source_event_idx" ON "agent_runs" USING btree ("source_event_id");--> statement-breakpoint
CREATE INDEX "agent_runs_lease_idx" ON "agent_runs" USING btree ("lease_expires_at") WHERE status = 'running';--> statement-breakpoint
CREATE INDEX "agent_runs_correlation_idx" ON "agent_runs" USING btree ("correlation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_run_steps_run_sequence_uq" ON "agent_run_steps" USING btree ("run_id","sequence");--> statement-breakpoint
CREATE INDEX "agent_run_steps_run_created_idx" ON "agent_run_steps" USING btree ("run_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_run_steps_status_idx" ON "agent_run_steps" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_tool_calls_idempotency_key_uq" ON "agent_tool_calls" USING btree ("idempotency_key") WHERE idempotency_key IS NOT NULL;--> statement-breakpoint
CREATE INDEX "agent_tool_calls_run_created_idx" ON "agent_tool_calls" USING btree ("run_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_tool_calls_tool_created_idx" ON "agent_tool_calls" USING btree ("tool_name","created_at");--> statement-breakpoint
CREATE INDEX "agent_tool_calls_status_idx" ON "agent_tool_calls" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_approvals_tool_call_uq" ON "agent_approvals" USING btree ("tool_call_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_approvals_pending_hash_uq" ON "agent_approvals" USING btree ("action_hash") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "agent_approvals_status_expiry_idx" ON "agent_approvals" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "agent_approvals_decider_idx" ON "agent_approvals" USING btree ("decided_by_user_id","decided_at");--> statement-breakpoint
CREATE INDEX "agent_approvals_run_idx" ON "agent_approvals" USING btree ("run_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_schedules_slug_uq" ON "agent_schedules" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "agent_schedules_due_idx" ON "agent_schedules" USING btree ("enabled","next_run_at") WHERE enabled = true;--> statement-breakpoint
CREATE INDEX "agent_schedules_agent_idx" ON "agent_schedules" USING btree ("agent_id","enabled");--> statement-breakpoint
CREATE INDEX "agent_memories_scope_idx" ON "agent_memories" USING btree ("scope","scope_user_id","agent_id","memory_key");--> statement-breakpoint
CREATE INDEX "agent_memories_validity_idx" ON "agent_memories" USING btree ("verification_status","valid_until");--> statement-breakpoint
CREATE INDEX "agent_memories_agent_idx" ON "agent_memories" USING btree ("agent_id","verification_status");--> statement-breakpoint
CREATE INDEX "agent_usage_agent_occurred_idx" ON "agent_usage_ledger" USING btree ("agent_id","occurred_at");--> statement-breakpoint
CREATE INDEX "agent_usage_run_occurred_idx" ON "agent_usage_ledger" USING btree ("run_id","occurred_at");--> statement-breakpoint
CREATE INDEX "agent_usage_provider_model_idx" ON "agent_usage_ledger" USING btree ("provider","model","occurred_at");--> statement-breakpoint
CREATE INDEX "agent_worker_heartbeats_seen_idx" ON "agent_worker_heartbeats" USING btree ("last_heartbeat_at");--> statement-breakpoint
CREATE INDEX "agent_worker_heartbeats_status_idx" ON "agent_worker_heartbeats" USING btree ("status","last_heartbeat_at");