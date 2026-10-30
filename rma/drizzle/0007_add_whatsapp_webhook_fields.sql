ALTER TABLE "tenant" ADD COLUMN "whatsapp_webhook_token" text;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "whatsapp_phone_number_id" text;--> statement-breakpoint
ALTER TABLE "tenant" ADD CONSTRAINT "tenant_whatsapp_webhook_token_unique" UNIQUE("whatsapp_webhook_token");