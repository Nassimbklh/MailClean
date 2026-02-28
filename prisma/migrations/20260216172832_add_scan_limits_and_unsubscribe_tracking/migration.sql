-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "senderKey" TEXT NOT NULL,
    "senderName" TEXT,
    "count" INTEGER NOT NULL,
    "undoable" BOOLEAN NOT NULL DEFAULT false,
    "undone" BOOLEAN NOT NULL DEFAULT false,
    "undoPayload" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ActivityLog" ("actionType", "count", "id", "senderKey", "senderName", "timestamp", "undoPayload", "undoable", "userId") SELECT "actionType", "count", "id", "senderKey", "senderName", "timestamp", "undoPayload", "undoable", "userId" FROM "ActivityLog";
DROP TABLE "ActivityLog";
ALTER TABLE "new_ActivityLog" RENAME TO "ActivityLog";
CREATE INDEX "ActivityLog_userId_timestamp_idx" ON "ActivityLog"("userId", "timestamp");
CREATE TABLE "new_ScanState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nextPageToken" TEXT,
    "scannedCount" INTEGER NOT NULL DEFAULT 0,
    "senderCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "hasShownFirstScanToast" BOOLEAN NOT NULL DEFAULT false,
    "lastScanAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ScanState" ("createdAt", "id", "nextPageToken", "scannedCount", "senderCount", "status", "updatedAt", "userId") SELECT "createdAt", "id", "nextPageToken", "scannedCount", "senderCount", "status", "updatedAt", "userId" FROM "ScanState";
DROP TABLE "ScanState";
ALTER TABLE "new_ScanState" RENAME TO "ScanState";
CREATE UNIQUE INDEX "ScanState_userId_key" ON "ScanState"("userId");
CREATE TABLE "new_SenderStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "senderKey" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "domain" TEXT,
    "count" INTEGER NOT NULL DEFAULT 0,
    "emailsCount" INTEGER NOT NULL DEFAULT 0,
    "lastDate" DATETIME,
    "unsubAvailable" BOOLEAN NOT NULL DEFAULT false,
    "unsubUrl" TEXT,
    "unsubMailto" TEXT,
    "cleanedCount" INTEGER NOT NULL DEFAULT 0,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SenderStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SenderStat" ("cleanedCount", "count", "createdAt", "domain", "email", "id", "lastDate", "name", "senderKey", "unsubAvailable", "unsubMailto", "unsubUrl", "unsubscribed", "updatedAt", "userId") SELECT "cleanedCount", "count", "createdAt", "domain", "email", "id", "lastDate", "name", "senderKey", "unsubAvailable", "unsubMailto", "unsubUrl", "unsubscribed", "updatedAt", "userId" FROM "SenderStat";
DROP TABLE "SenderStat";
ALTER TABLE "new_SenderStat" RENAME TO "SenderStat";
CREATE INDEX "SenderStat_userId_idx" ON "SenderStat"("userId");
CREATE UNIQUE INDEX "SenderStat_userId_senderKey_key" ON "SenderStat"("userId", "senderKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
