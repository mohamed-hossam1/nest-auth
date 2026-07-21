CREATE TYPE "user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL UNIQUE,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL UNIQUE,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refresh_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"device_name" text,
	"user_agent" text,
	"ip_address" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"name" text,
	"role" "user_role" DEFAULT 'user'::"user_role" NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "email_verification_tokens_token_hash_idx" ON "email_verification_tokens" ("token_hash");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_token_hash_idx" ON "password_reset_tokens" ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_sessions_user_id_idx" ON "refresh_sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_sessions_token_hash_idx" ON "refresh_sessions" ("token_hash");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" ("role");--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;