-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "promotionId" TEXT,
ADD COLUMN     "promotionName" TEXT;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
