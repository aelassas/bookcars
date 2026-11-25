ALTER TABLE "account"
  ALTER COLUMN "expires_at" SET DATA TYPE integer
  USING (CASE WHEN "expires_at" IS NULL THEN NULL ELSE EXTRACT(EPOCH FROM "expires_at")::integer END);
