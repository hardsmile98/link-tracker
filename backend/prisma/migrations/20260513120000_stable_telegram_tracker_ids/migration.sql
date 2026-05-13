ALTER TABLE "incoming_messages"
  DROP CONSTRAINT IF EXISTS "incoming_messages_tracked_account_id_fkey";

ALTER TABLE "telegram_tracked_accounts"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "id" TYPE TEXT USING "id"::text;

ALTER TABLE "incoming_messages"
  ALTER COLUMN "tracked_account_id" TYPE TEXT USING "tracked_account_id"::text;
