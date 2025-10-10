/*
  Warnings:

  - You are about to drop the column `unitValueCents` on the `Store` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN "product" TEXT;
ALTER TABLE "Voucher" ADD COLUMN "quantity" INTEGER;

-- CreateTable
CREATE TABLE "StorePrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "unitCents" INTEGER NOT NULL,
    CONSTRAINT "StorePrice_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "StorePrice" ("id", "storeId", "product", "unitCents")
SELECT 'legacy-' || "id", "id", 'GALAO_20L', "unitValueCents"
FROM "Store"
WHERE "unitValueCents" IS NOT NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" INTEGER,
    "name" TEXT NOT NULL,
    "externalCode" TEXT,
    "addressRaw" TEXT NOT NULL,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT,
    "geoLat" DECIMAL,
    "geoLng" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Store_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Store" ("addressRaw", "city", "complement", "createdAt", "district", "externalCode", "geoLat", "geoLng", "id", "name", "number", "partnerId", "postalCode", "state", "status", "street", "updatedAt") SELECT "addressRaw", "city", "complement", "createdAt", "district", "externalCode", "geoLat", "geoLng", "id", "name", "number", "partnerId", "postalCode", "state", "status", "street", "updatedAt" FROM "Store";
DROP TABLE "Store";
ALTER TABLE "new_Store" RENAME TO "Store";
CREATE UNIQUE INDEX "Store_externalCode_key" ON "Store"("externalCode");
CREATE INDEX "Store_partnerId_idx" ON "Store"("partnerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "StorePrice_storeId_product_key" ON "StorePrice"("storeId", "product");
