/*
  Warnings:

  - The values [CARD] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `date` to the `purchases` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('CASH', 'BKASH', 'NAGAD');
ALTER TABLE "payments" ALTER COLUMN "method" TYPE "PaymentMethod_new" USING ("method"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
COMMIT;

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "invoice_no" TEXT;
