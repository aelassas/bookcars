ALTER TABLE "lease" ADD COLUMN "sales_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "lease" ADD COLUMN "contract_type" text DEFAULT 'deposit' NOT NULL;--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN "sales_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN "contract_type" text DEFAULT 'deposit' NOT NULL;--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN "deposit_status" text DEFAULT 'held' NOT NULL;--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN "deposit_refunded" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN "deposit_withheld_reason" text;--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN "deposit_resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN "deposit_resolved_by" uuid;--> statement-breakpoint
ALTER TABLE "lease" ADD CONSTRAINT "lease_sales_agent_id_user_id_fk" FOREIGN KEY ("sales_agent_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental" ADD CONSTRAINT "rental_sales_agent_id_user_id_fk" FOREIGN KEY ("sales_agent_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental" ADD CONSTRAINT "rental_deposit_resolved_by_user_id_fk" FOREIGN KEY ("deposit_resolved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;