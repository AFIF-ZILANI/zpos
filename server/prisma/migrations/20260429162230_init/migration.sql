/*
  Warnings:

  - The values [RETURNED] on the enum `SaleStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [SALE_RETURN] on the enum `StockMovementType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `status` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `return_id` on the `stock_ledgers` table. All the data in the column will be lost.
  - You are about to drop the `sale_return_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sale_returns` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SaleStatus_new" AS ENUM ('COMPLETED', 'VOID');
ALTER TABLE "public"."sales" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "sales" ALTER COLUMN "status" TYPE "SaleStatus_new" USING ("status"::text::"SaleStatus_new");
ALTER TYPE "SaleStatus" RENAME TO "SaleStatus_old";
ALTER TYPE "SaleStatus_new" RENAME TO "SaleStatus";
DROP TYPE "public"."SaleStatus_old";
ALTER TABLE "sales" ALTER COLUMN "status" SET DEFAULT 'COMPLETED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "StockMovementType_new" AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT');
ALTER TABLE "stock_ledgers" ALTER COLUMN "type" TYPE "StockMovementType_new" USING ("type"::text::"StockMovementType_new");
ALTER TYPE "StockMovementType" RENAME TO "StockMovementType_old";
ALTER TYPE "StockMovementType_new" RENAME TO "StockMovementType";
DROP TYPE "public"."StockMovementType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "sale_return_items" DROP CONSTRAINT "sale_return_items_return_id_fkey";

-- DropForeignKey
ALTER TABLE "sale_return_items" DROP CONSTRAINT "sale_return_items_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "sale_returns" DROP CONSTRAINT "sale_returns_sale_id_fkey";

-- DropForeignKey
ALTER TABLE "sale_returns" DROP CONSTRAINT "sale_returns_user_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_ledgers" DROP CONSTRAINT "stock_ledgers_return_id_fkey";

-- DropIndex
DROP INDEX "payments_method_status_idx";

-- DropIndex
DROP INDEX "payments_status_created_at_idx";

-- DropIndex
DROP INDEX "payments_status_idx";

-- DropIndex
DROP INDEX "product_variants_sku_idx";

-- DropIndex
DROP INDEX "product_variants_sku_key";

-- DropIndex
DROP INDEX "sales_created_at_idx";

-- DropIndex
DROP INDEX "stock_ledgers_return_id_idx";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "sku";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "brand" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "waived_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "stock_ledgers" DROP COLUMN "return_id";

-- DropTable
DROP TABLE "sale_return_items";

-- DropTable
DROP TABLE "sale_returns";

-- DropEnum
DROP TYPE "PaymentStatus";
