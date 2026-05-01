/*
  Warnings:

  - You are about to drop the column `invoice_no` on the `sales` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'ROCKET';

-- DropIndex
DROP INDEX "sales_invoice_no_idx";

-- DropIndex
DROP INDEX "sales_invoice_no_key";

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "sales" DROP COLUMN "invoice_no";
