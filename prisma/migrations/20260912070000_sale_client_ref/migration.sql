-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "clientRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_clientRef_key" ON "Sale"("clientRef");
