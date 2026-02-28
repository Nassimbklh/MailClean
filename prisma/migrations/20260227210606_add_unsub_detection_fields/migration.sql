-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "unsubDetectionLevel" TEXT,
    "unsubLinkOpened" BOOLEAN NOT NULL DEFAULT false,
    "unsubLinkOpenedAt" DATETIME,
    "unsubLastCheckAt" DATETIME,
    "cleanedCount" INTEGER NOT NULL DEFAULT 0,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SenderStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SenderStat" ("cleanedCount", "count", "createdAt", "domain", "email", "emailsCount", "id", "lastDate", "name", "senderKey", "unsubAvailable", "unsubMailto", "unsubUrl", "unsubscribed", "unsubscribedAt", "updatedAt", "userId") SELECT "cleanedCount", "count", "createdAt", "domain", "email", "emailsCount", "id", "lastDate", "name", "senderKey", "unsubAvailable", "unsubMailto", "unsubUrl", "unsubscribed", "unsubscribedAt", "updatedAt", "userId" FROM "SenderStat";
DROP TABLE "SenderStat";
ALTER TABLE "new_SenderStat" RENAME TO "SenderStat";
CREATE INDEX "SenderStat_userId_idx" ON "SenderStat"("userId");
CREATE UNIQUE INDEX "SenderStat_userId_senderKey_key" ON "SenderStat"("userId", "senderKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
