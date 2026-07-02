CREATE TABLE "connected_social_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" varchar(20) NOT NULL,
	"provider_user_id" text NOT NULL,
	"username" text,
	"avatar_url" text,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text,
	"scopes" text[],
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connected_social_accounts" ADD CONSTRAINT "connected_social_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "connected_social_accounts_provider_provider_user_id_uq" ON "connected_social_accounts" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "connected_social_accounts_user_id_provider_uq" ON "connected_social_accounts" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "connected_social_accounts_user_id_idx" ON "connected_social_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "connected_social_accounts_provider_idx" ON "connected_social_accounts" USING btree ("provider");