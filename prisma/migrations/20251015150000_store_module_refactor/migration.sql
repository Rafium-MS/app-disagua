-- Create default brands for stores without brand assignment
INSERT INTO "Brand" ("id", "partnerId", "name", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), s."partnerId", 'Marca padrão ' || s."partnerId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "partnerId"
  FROM "Store"
  WHERE "brandId" IS NULL
) AS s
WHERE NOT EXISTS (
  SELECT 1 FROM "Brand" b WHERE b."partnerId" = s."partnerId" AND b."name" = 'Marca padrão ' || s."partnerId"
);

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" INTEGER NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "deliveryPlace" TEXT NOT NULL,
    "addressRaw" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "mall" TEXT,
    "cnpj" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Store_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Store_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Store" (
    "id",
    "partnerId",
    "brandId",
    "name",
    "normalizedName",
    "deliveryPlace",
    "addressRaw",
    "street",
    "number",
    "complement",
    "district",
    "city",
    "state",
    "postalCode",
    "mall",
    "cnpj",
    "phone",
    "email",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT
    s."id",
    s."partnerId",
    COALESCE(
      s."brandId",
      (
        SELECT b."id"
        FROM "Brand" b
        WHERE b."partnerId" = s."partnerId"
        ORDER BY b."createdAt"
        LIMIT 1
      )
    ) AS "brandId",
    s."name",
    s."normalizedName",
    COALESCE(NULLIF(trim(s."addressRaw"), ''), NULLIF(trim(s."city" || ' - ' || s."state"), ' - '), 'Local de entrega não informado'),
    NULLIF(s."addressRaw", ''),
    NULLIF(s."street", ''),
    NULLIF(s."number", ''),
    NULLIF(s."complement", ''),
    NULLIF(s."district", ''),
    NULLIF(s."city", ''),
    NULLIF(s."state", ''),
    NULLIF(s."postalCode", ''),
    NULLIF(s."mall", ''),
    NULLIF(s."cnpj", ''),
    NULLIF(s."phone", ''),
    NULLIF(s."email", ''),
    s."status",
    s."createdAt",
    s."updatedAt"
FROM "Store" s
WHERE COALESCE(
  s."brandId",
  (
    SELECT b."id"
    FROM "Brand" b
    WHERE b."partnerId" = s."partnerId"
    ORDER BY b."createdAt"
    LIMIT 1
  )
) IS NOT NULL;

DROP TABLE "Store";
ALTER TABLE "new_Store" RENAME TO "Store";

CREATE UNIQUE INDEX "Store_cnpj_key" ON "Store"("cnpj");
CREATE INDEX "Store_partnerId_brandId_idx" ON "Store"("partnerId", "brandId");
CREATE UNIQUE INDEX "Store_brandId_normalizedName_city_mall_key" ON "Store"("brandId", "normalizedName", "city", "mall");

CREATE TABLE "new_StorePrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "unitCents" INTEGER NOT NULL,
    CONSTRAINT "StorePrice_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_StorePrice" ("id", "storeId", "product", "unitCents")
SELECT sp."id", sp."storeId", sp."product", sp."unitCents"
FROM "StorePrice" sp
INNER JOIN "Store" s ON s."id" = sp."storeId";

DROP TABLE "StorePrice";
ALTER TABLE "new_StorePrice" RENAME TO "StorePrice";

CREATE UNIQUE INDEX "StorePrice_storeId_product_key" ON "StorePrice"("storeId", "product");

DROP TABLE IF EXISTS "StoreDeliveredProduct";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
