/*
  Warnings:

  - You are about to drop the column `note` on the `variant_barcode_allocations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "barcodes" ADD COLUMN     "serial" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "variant_barcode_allocations" DROP COLUMN "note";

-- CreateIndex
CREATE INDEX "barcodes_serial_idx" ON "barcodes"("serial");
