CREATE TYPE "public"."key_status" AS ENUM('active', 'inactive', 'expired', 'rate_limited');--> statement-breakpoint
CREATE TYPE "public"."key_type" AS ENUM('free', 'paid');--> statement-breakpoint

CREATE TABLE "llm_api_key_model" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key_id" integer NOT NULL,
	"model_id" integer NOT NULL,
	"request_per_minute" integer NOT NULL,
	"request_per_day" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);

--> statement-breakpoint
CREATE TABLE "llm_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "llm_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"index" integer NOT NULL,
	"description" text,
	"base_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "llm_providers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "provider_llm_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"index" integer NOT NULL,
	"key_value" text NOT NULL,
	"key_type" "key_type" NOT NULL,
	"status" "key_status" DEFAULT 'active' NOT NULL,
	"usage_limit_per_day" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "llm_api_key_model" ADD CONSTRAINT "llm_api_key_model_api_key_id_provider_llm_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."provider_llm_api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_api_key_model" ADD CONSTRAINT "llm_api_key_model_model_id_llm_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."llm_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_models" ADD CONSTRAINT "llm_models_provider_id_llm_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."llm_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_llm_api_keys" ADD CONSTRAINT "provider_llm_api_keys_provider_id_llm_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."llm_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_model_unique" ON "llm_api_key_model" USING btree ("api_key_id","model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_model_unique" ON "llm_models" USING btree ("provider_id","name");