/*
  Warnings:

  - You are about to drop the `UserStats` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "UserStats_userId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserStats";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "totalDeleted" INTEGER NOT NULL DEFAULT 0,
    "totalUnsubscribes" INTEGER NOT NULL DEFAULT 0,
    "totalArchived" INTEGER NOT NULL DEFAULT 0,
    "mailboxTotalCount" INTEGER,
    "lastMailboxSync" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserMetrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserMetrics" ("createdAt", "id", "totalDeleted", "totalUnsubscribes", "updatedAt", "userId") SELECT "createdAt", "id", "totalDeleted", "totalUnsubscribes", "updatedAt", "userId" FROM "UserMetrics";
DROP TABLE "UserMetrics";
ALTER TABLE "new_UserMetrics" RENAME TO "UserMetrics";
CREATE UNIQUE INDEX "UserMetrics_userId_key" ON "UserMetrics"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
