ALTER TABLE "message" DROP CONSTRAINT "message_tenant_id_tenant_id_fk";
--> statement-breakpoint
ALTER TABLE "message" ALTER COLUMN "from" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "to" text;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "external_message_id" text;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "related_entity_type" text;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "related_entity_id" uuid;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_related_entity_idx" ON "message" USING btree ("tenant_id","related_entity_type","related_entity_id");