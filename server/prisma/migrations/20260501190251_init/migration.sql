/*
  Warnings:

  - You are about to drop the column `password_hash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password_hash",
DROP COLUMN "refresh_token",
ADD COLUMN     "status" "InviteStatus" NOT NULL DEFAULT 'PENDING';
