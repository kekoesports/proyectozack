CREATE TYPE "public"."ip_document_category" AS ENUM('ownership', 'people', 'cost', 'technical', 'valuation', 'tax', 'transfer_pricing', 'corporate', 'revenue', 'brand_domain', 'other');--> statement-breakpoint
CREATE TYPE "public"."ip_document_status" AS ENUM('draft', 'collected', 'review_required', 'advisor_approved', 'replaced');--> statement-breakpoint
CREATE TYPE "public"."ip_document_storage_location" AS ENUM('google_drive', 'crm_private', 'github', 'other');--> statement-breakpoint
CREATE TABLE "ip_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"requirement_code" varchar(60) NOT NULL,
	"title" varchar(240) NOT NULL,
	"category" "ip_document_category" NOT NULL,
	"status" "ip_document_status" NOT NULL,
	"legal_entity" "ip_legal_entity",
	"storage_location" "ip_document_storage_location" NOT NULL,
	"document_ref" varchar(1000) NOT NULL,
	"version_label" varchar(80),
	"content_sha256" varchar(64),
	"effective_on" date,
	"expires_on" date,
	"notes" text,
	"integrity_hash" varchar(64) NOT NULL,
	"recorded_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ip_documents_content_sha256_check" CHECK ("ip_documents"."content_sha256" IS NULL OR "ip_documents"."content_sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "ip_documents" ADD CONSTRAINT "ip_documents_project_id_ip_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ip_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_documents" ADD CONSTRAINT "ip_documents_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ip_documents_integrity_hash_uq" ON "ip_documents" USING btree ("integrity_hash");--> statement-breakpoint
CREATE INDEX "ip_documents_project_created_idx" ON "ip_documents" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "ip_documents_requirement_created_idx" ON "ip_documents" USING btree ("requirement_code","created_at");--> statement-breakpoint
CREATE INDEX "ip_documents_status_idx" ON "ip_documents" USING btree ("status");--> statement-breakpoint

CREATE OR REPLACE FUNCTION prevent_ip_documents_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ip_documents is append-only; register a new version instead';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER ip_documents_append_only
BEFORE UPDATE OR DELETE ON "ip_documents"
FOR EACH ROW EXECUTE FUNCTION prevent_ip_documents_mutation();--> statement-breakpoint

INSERT INTO "ip_documents" (
  "project_id", "requirement_code", "title", "category", "status",
  "storage_location", "document_ref", "version_label", "content_sha256",
  "notes", "integrity_hash"
)
SELECT
  p."id", seed."requirement_code", seed."title",
  seed."category"::"ip_document_category",
  seed."status"::"ip_document_status",
  seed."storage_location"::"ip_document_storage_location",
  seed."document_ref", seed."version_label", seed."content_sha256",
  seed."notes", seed."integrity_hash"
FROM "ip_projects" p
CROSS JOIN (
  VALUES
    (
      'TECH-PROVENANCE',
      'Procedencia de IP — baseline PRE-CYPRUS',
      'technical', 'collected', 'google_drive',
      'https://drive.google.com/file/d/1rC5KYmcZ6sHuOGkxO4l9Un7DM3z8qiGp/view',
      'baseline-2026-09-01',
      '56fdf96f25e24b33931f76c4e386ed8371ce6f75ac7c4eb4995d31e431fa42c3',
      'Baseline técnico factual; la titularidad jurídica permanece pendiente de acreditación.',
      '85de45a8a69873ec115441065bf5dcdf8f7d96b151009568d9c521b924b90175'
    ),
    (
      'PEOPLE-CONTRIBUTORS',
      'Protocolo de contribuyentes históricos',
      'people', 'draft', 'google_drive',
      'https://drive.google.com/file/d/1sRENvyT_4O54mjYDM9loziImwmED61uJ/view',
      'plantilla-v1',
      '8570c143b1997912760836e4b10d5dada0624c2ade94c79db7c72c3d8abfcd13',
      'Es un protocolo y no sustituye los expedientes factuales ni contratos firmados.',
      '3bb055053db1ef584701316a3de56a9c103de13c006d997aef71c2cd5acdcbd3'
    ),
    (
      'PEOPLE-FOUNDER',
      'Política de tiempo y coste del fundador',
      'ownership', 'draft', 'google_drive',
      'https://drive.google.com/file/d/1PRXPX-dnjTfLWL1FewXiXyZ31PWucyeh/view',
      'politica-v1',
      '83af0f2838690dbac15f0b7dc4bc9f9efd1054d0c6b75e4571bf89483d587722',
      'Pendiente de conciliar con contratos, acuerdos societarios y nóminas reales.',
      '0ecca7eaab167b8e20cde3c4391daad6c5eb3bc601fe3fa745beeb9526342404'
    ),
    (
      'COST-REGISTER',
      'Plantilla de costes reales de I+D',
      'cost', 'draft', 'google_drive',
      'https://drive.google.com/file/d/1uuq0Q0HpvMml200m6tp-SCFLGxAHqNZD/view',
      'plantilla-v1',
      '2132550d1c43a2a4b6958ff6d0766209199d81f38af18be0839fddcf6a3e5b63',
      'Plantilla vacía; no se considera coste conciliado hasta adjuntar documentos y pagos reales.',
      '3dc8654266f20af40368bf45d08826e01b0be2d98d67d36114da213d8d284a42'
    ),
    (
      'TECH-THIRD-PARTY',
      'Plantilla de licencias y componentes de terceros',
      'technical', 'draft', 'google_drive',
      'https://drive.google.com/file/d/105O9NTjy8lxT1mKWcKb3sI3b1rHgayoq/view',
      'plantilla-v1',
      '19e3054d95815c62a91e7635b972dc95460d1bc76d03b926d15bf8ce0f31f4be',
      'Plantilla vacía; debe completarse con versiones, términos y restricciones verificadas.',
      '58fcad41700d22e0e662007b569f0df8f6a750b25fab8e2b38b2e06754c95a94'
    ),
    (
      'PRODUCT-ARCHITECTURE',
      'KekoPilot — arquitectura de producto y dominio',
      'brand_domain', 'collected', 'google_drive',
      'https://drive.google.com/file/d/1zHmNhVrZdaJqMAWQ4Kg9OxhPiV9ohoTh/view',
      'decision-v1',
      '0a3547d2f2bdb83426c655a200d5550e693e88eb40abf8e55760ef419519b6c0',
      'Define web pública y panel SaaS sin iniciar el core antes de cerrar el gate jurídico/fiscal.',
      '21598142a6d29902612060fb56b72088c9402f4279282f91058d729b942f6d71'
    )
) AS seed(
  "requirement_code", "title", "category", "status", "storage_location",
  "document_ref", "version_label", "content_sha256", "notes", "integrity_hash"
)
WHERE p."code" = 'SP-PRE-001';
