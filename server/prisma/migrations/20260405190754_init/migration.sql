/*
  Warnings:

  - You are about to drop the column `barcode` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[product_ref]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sku]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[barcode]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `barcode` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sku` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Product_barcode_key";

-- DropIndex
DROP INDEX "Product_sku_key";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "barcode",
DROP COLUMN "sku";

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "barcode" TEXT NOT NULL,
ADD COLUMN     "product_ref" SERIAL NOT NULL,
ADD COLUMN     "sku" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_product_ref_key" ON "ProductVariant"("product_ref");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_barcode_key" ON "ProductVariant"("barcode");
