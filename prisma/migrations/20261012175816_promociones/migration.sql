-- CreateTable
CREATE TABLE "Promo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🎁',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoItem" (
    "id" TEXT NOT NULL,
    "promoId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "PromoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Promo_visible_position_idx" ON "Promo"("visible", "position");

-- CreateIndex
CREATE INDEX "PromoItem_productId_idx" ON "PromoItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoItem_promoId_productId_key" ON "PromoItem"("promoId", "productId");

-- AddForeignKey
ALTER TABLE "PromoItem" ADD CONSTRAINT "PromoItem_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "Promo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoItem" ADD CONSTRAINT "PromoItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
