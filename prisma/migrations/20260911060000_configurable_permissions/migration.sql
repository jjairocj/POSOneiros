-- Backfill Role.permissions to the new configurable-permission vocabulary
-- (see lib/auth.ts PERMISSION_KEYS), preserving today's effective access:
-- SUPERVISOR keeps every delegable permission, CASHIER keeps none, ADMIN is
-- untouched (always bypasses the permissions check).
UPDATE "Role"
SET "permissions" = ARRAY['VIEW_DASHBOARD', 'MANAGE_CATALOG', 'RECEIVE_INVENTORY', 'VOID_SALE', 'VIEW_REPORTS']
WHERE "name" = 'SUPERVISOR';

UPDATE "Role"
SET "permissions" = ARRAY[]::TEXT[]
WHERE "name" = 'CASHIER';
