-- CreateTable
CREATE TABLE "StoreDeliveredProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    CONSTRAINT "StoreDeliveredProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreDeliveredProduct_storeId_product_key" ON "StoreDeliveredProduct"("storeId", "product");
