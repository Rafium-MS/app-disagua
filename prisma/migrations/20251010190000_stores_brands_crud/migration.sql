-- Create Brand table
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Brand_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Brand_code_key" ON "Brand"("code");
CREATE UNIQUE INDEX "Brand_partnerId_name_key" ON "Brand"("partnerId", "name");

-- Redefine Store table with new structure
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" INTEGER NOT NULL,
    "brandId" TEXT,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "externalCode" TEXT,
    "cnpj" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "mall" TEXT,
    "addressRaw" TEXT NOT NULL,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Store_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Store_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Store" (
    "id",
    "partnerId",
    "brandId",
    "name",
    "normalizedName",
    "externalCode",
    "cnpj",
    "phone",
    "email",
    "mall",
    "addressRaw",
    "street",
    "number",
    "complement",
    "district",
    "city",
    "state",
    "postalCode",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    COALESCE("partnerId", (SELECT "id" FROM "Partner" ORDER BY "id" LIMIT 1)),
    NULL,
    "name",
    LOWER(TRIM("name")),
    "externalCode",
    NULL,
    NULL,
    NULL,
    NULL,
    "addressRaw",
    "street",
    "number",
    "complement",
    "district",
    "city",
    "state",
    "postalCode",
    "status",
    "createdAt",
    "updatedAt"
FROM "Store"
WHERE COALESCE("partnerId", (SELECT "id" FROM "Partner" ORDER BY "id" LIMIT 1)) IS NOT NULL;

DROP TABLE "Store";
ALTER TABLE "new_Store" RENAME TO "Store";

CREATE UNIQUE INDEX "Store_externalCode_key" ON "Store"("externalCode");
CREATE UNIQUE INDEX "Store_cnpj_key" ON "Store"("cnpj");
CREATE INDEX "Store_partnerId_brandId_idx" ON "Store"("partnerId", "brandId");
CREATE UNIQUE INDEX "Store_partnerId_brandId_normalizedName_city_mall_key" ON "Store"("partnerId", "brandId", "normalizedName", "city", "mall");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
