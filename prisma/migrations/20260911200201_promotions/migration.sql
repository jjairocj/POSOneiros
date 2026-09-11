-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionCondition" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "productId" TEXT,
    "familyId" TEXT,
    "minQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "PromotionCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionEffect" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetProductId" TEXT,
    "targetFamilyId" TEXT,
    "value" DOUBLE PRECISION,
    "targetQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "PromotionEffect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Promotion_isActive_idx" ON "Promotion"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionEffect_promotionId_key" ON "PromotionEffect"("promotionId");

-- AddForeignKey
ALTER TABLE "PromotionCondition" ADD CONSTRAINT "PromotionCondition_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionCondition" ADD CONSTRAINT "PromotionCondition_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionCondition" ADD CONSTRAINT "PromotionCondition_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "ProductFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionEffect" ADD CONSTRAINT "PromotionEffect_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionEffect" ADD CONSTRAINT "PromotionEffect_targetProductId_fkey" FOREIGN KEY ("targetProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionEffect" ADD CONSTRAINT "PromotionEffect_targetFamilyId_fkey" FOREIGN KEY ("targetFamilyId") REFERENCES "ProductFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;
