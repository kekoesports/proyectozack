CREATE TABLE IF NOT EXISTS "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"team1" varchar(100) NOT NULL,
	"team2" varchar(100) NOT NULL,
	"team1_logo" varchar(500),
	"team2_logo" varchar(500),
	"tournament" varchar(200),
	"match_date" date,
	"match_time" varchar(5),
	"match_status" varchar(20) DEFAULT 'upcoming',
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
