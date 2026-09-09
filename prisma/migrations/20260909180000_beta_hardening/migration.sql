-- DropIndex
DROP INDEX "SubAccount_saleId_key";

-- AlterTable
ALTER TABLE "Register" ADD COLUMN     "nextNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" TEXT,
ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "number" INTEGER,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'POS';

-- AlterTable
ALTER TABLE "SaleDetail" ADD COLUMN     "productCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "productName" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_source_externalRef_key" ON "Sale"("source", "externalRef");


-- Backfill product snapshots for existing sale lines
UPDATE "SaleDetail" d SET "productName" = p."name", "productCode" = p."code"
FROM "Product" p WHERE p."id" = d."productId" AND d."productName" = '';
