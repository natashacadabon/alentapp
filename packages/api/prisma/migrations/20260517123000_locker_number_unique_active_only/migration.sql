-- Keep locker number unique only for active (non-deleted) lockers
DROP INDEX IF EXISTS "lockers_number_key";
DROP INDEX IF EXISTS "lockers_number_active_key";

CREATE UNIQUE INDEX "lockers_number_active_key"
ON "lockers" ("number")
WHERE "deleted_at" IS NULL;
