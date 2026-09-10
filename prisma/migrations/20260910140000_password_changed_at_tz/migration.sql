-- Make passwordChangedAt timezone-aware (timestamptz) so comparisons are
-- unambiguous regardless of a connection's session TimeZone setting.
-- Existing values (none in practice yet) are reinterpreted as UTC, matching
-- how Prisma/adapter-pg already write and read this column.
ALTER TABLE "User" ALTER COLUMN "passwordChangedAt" TYPE TIMESTAMPTZ(3) USING "passwordChangedAt" AT TIME ZONE 'UTC';
