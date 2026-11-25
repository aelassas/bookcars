CREATE TABLE "platform_admin" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"promoted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"promoted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "platform_admin" ADD CONSTRAINT "platform_admin_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admin" ADD CONSTRAINT "platform_admin_promoted_by_user_id_fk" FOREIGN KEY ("promoted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;