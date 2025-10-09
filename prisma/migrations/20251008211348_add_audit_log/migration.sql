-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "actor" TEXT,
    "requestId" TEXT,
    "requestMethod" TEXT,
    "requestUrl" TEXT,
    "ipAddress" TEXT,
    "changes" TEXT
);
