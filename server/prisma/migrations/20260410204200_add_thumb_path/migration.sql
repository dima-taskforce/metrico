-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RoomPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "photoType" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "thumbPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomPhoto_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RoomPhoto" ("createdAt", "id", "photoType", "roomId", "originalPath") SELECT "createdAt", "id", "photoType", "roomId", "filePath" FROM "RoomPhoto";
DROP TABLE "RoomPhoto";
ALTER TABLE "new_RoomPhoto" RENAME TO "RoomPhoto";
CREATE INDEX "RoomPhoto_roomId_idx" ON "RoomPhoto"("roomId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
