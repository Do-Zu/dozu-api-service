CREATE TYPE "public"."question_status" AS ENUM('new', 'learning', 'review');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TABLE "questions" (
	"question_id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer,
	"choices" text[],
	"correct_index" integer,
	"repetition_number" integer DEFAULT 0,
	"easiness_factor" numeric(3, 2) DEFAULT '2.5',
	"interval" integer DEFAULT 0,
	"last_reviewed" date,
	"next_review" date,
	"status" "question_status" DEFAULT 'new',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"percent_complete" double precision DEFAULT 0,
	"completed" boolean DEFAULT false,
	"rescheduled" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "study_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer NOT NULL,
	"input_set_id" integer,
	"name" varchar(255) NOT NULL,
	"priority_level" interval,
	"difficulty_level" interval,
	"assigned_duration" interval NOT NULL,
	"estimated_time" interval,
	"deadline" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "learning_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "study_slots_learning_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"method_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"task_id" integer,
	"original_schedule_id" integer,
	"new_schedule_id" integer,
	"new_suggested_time" timestamp NOT NULL,
	"overdue" boolean DEFAULT false,
	"status" "reminder_status" DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_progress" (
	"progress_id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"percent_complete" double precision,
	"completed" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_topics_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("topic_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_topic_id_topics_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("topic_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_slots" ADD CONSTRAINT "study_slots_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_slots" ADD CONSTRAINT "study_slots_input_set_id_input_set_set_id_fk" FOREIGN KEY ("input_set_id") REFERENCES "public"."input_set"("set_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_methods" ADD CONSTRAINT "learning_methods_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_slots_learning_methods" ADD CONSTRAINT "study_slots_learning_methods_task_id_study_slots_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."study_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_slots_learning_methods" ADD CONSTRAINT "study_slots_learning_methods_method_id_learning_methods_id_fk" FOREIGN KEY ("method_id") REFERENCES "public"."learning_methods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_task_id_study_slots_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."study_slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_original_schedule_id_schedules_id_fk" FOREIGN KEY ("original_schedule_id") REFERENCES "public"."schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_new_schedule_id_schedules_id_fk" FOREIGN KEY ("new_schedule_id") REFERENCES "public"."schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_progress" ADD CONSTRAINT "task_progress_task_id_study_slots_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."study_slots"("id") ON DELETE cascade ON UPDATE no action;