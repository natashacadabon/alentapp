-- Add soft delete column
ALTER TABLE "lockers" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Keep locker number globally unique
DROP INDEX IF EXISTS "lockers_number_key";
CREATE UNIQUE INDEX "lockers_number_key" ON "lockers"("number");
