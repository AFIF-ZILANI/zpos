/*
  Warnings:

  - A unique constraint covering the columns `[invoice_number]` on the table `sales` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `invoice_number` to the `sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoiced_at` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "invoice_number" TEXT NOT NULL,
ADD COLUMN     "invoiced_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoice_number_key" ON "sales"("invoice_number");
