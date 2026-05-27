/*
  Warnings:

  - You are about to alter the column `additional_price` on the `sports` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "sports" ALTER COLUMN "additional_price" SET DATA TYPE DECIMAL(10,2);
