ALTER TABLE "tenant" ADD COLUMN "callgear_webhook_token" text;--> statement-breakpoint
ALTER TABLE "tenant" ADD CONSTRAINT "tenant_callgear_webhook_token_unique" UNIQUE("callgear_webhook_token");