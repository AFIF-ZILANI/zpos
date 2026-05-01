/*
  Warnings:

  - Added the required column `product_name` to the `sale_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `variant_name` to the `sale_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "product_name" TEXT NOT NULL,
ADD COLUMN     "variant_name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "counters" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("key")
);
