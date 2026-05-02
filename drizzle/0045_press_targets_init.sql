-- press_targets module: tabla, 2 enums propios y FK a user.
--
-- NOTA: drizzle-kit generó originalmente esta migración con ~480 líneas porque detectó
-- drift acumulado desde el snapshot 0043 (cnmc_status, talent_tax_type, files, deliverables,
-- contracts, etc. — todas ya aplicadas a Neon fuera del journal). Aquellos statements se
-- trimmearon de esta migración: CREATE TYPE/TABLE para enums y tablas que ya existen daría
-- error. El snapshot 0045_snapshot.json sí captura el HEAD entero, así que próximas migraciones
-- diff'an desde estado correcto.
CREATE TYPE "public"."press_target_category" AS ENUM('gaming-generalista', 'cs2-fps', 'igaming-skins', 'prensa-local', 'foro', 'periodista', 'otro');--> statement-breakpoint
CREATE TYPE "public"."press_target_outreach_status" AS ENUM('pendiente', 'contactado', 'respondido', 'publicado', 'descartado');--> statement-breakpoint
CREATE TABLE "press_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" varchar(255) NOT NULL,
	"name" varchar(300) NOT NULL,
	"url" text NOT NULL,
	"region" varchar(20) NOT NULL,
	"submission" varchar(500) NOT NULL,
	"summary" text,
	"category" "press_target_category" NOT NULL,
	"validated_at" timestamp with time zone,
	"notes" text,
	"outreach_status" "press_target_outreach_status" DEFAULT 'pendiente' NOT NULL,
	"assigned_to_user_id" text,
	"last_contacted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "press_targets_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "press_targets" ADD CONSTRAINT "press_targets_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "press_targets_category_idx" ON "press_targets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "press_targets_outreach_status_idx" ON "press_targets" USING btree ("outreach_status");--> statement-breakpoint
CREATE INDEX "press_targets_region_idx" ON "press_targets" USING btree ("region");--> statement-breakpoint
CREATE INDEX "press_targets_assigned_idx" ON "press_targets" USING btree ("assigned_to_user_id");
