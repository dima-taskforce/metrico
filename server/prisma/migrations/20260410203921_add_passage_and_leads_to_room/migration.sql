-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WallSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wallId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "segmentType" TEXT NOT NULL,
    "length" REAL NOT NULL,
    "offsetFromPrev" REAL,
    "depth" REAL,
    "isInner" BOOLEAN,
    "description" TEXT,
    "windowOpeningId" TEXT,
    "doorOpeningId" TEXT,
    "leadsToRoomId" TEXT,
    CONSTRAINT "WallSegment_wallId_fkey" FOREIGN KEY ("wallId") REFERENCES "Wall" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WallSegment_windowOpeningId_fkey" FOREIGN KEY ("windowOpeningId") REFERENCES "WindowOpening" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WallSegment_doorOpeningId_fkey" FOREIGN KEY ("doorOpeningId") REFERENCES "DoorOpening" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WallSegment_leadsToRoomId_fkey" FOREIGN KEY ("leadsToRoomId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WallSegment" ("depth", "description", "doorOpeningId", "id", "isInner", "length", "offsetFromPrev", "segmentType", "sortOrder", "wallId", "windowOpeningId") SELECT "depth", "description", "doorOpeningId", "id", "isInner", "length", "offsetFromPrev", "segmentType", "sortOrder", "wallId", "windowOpeningId" FROM "WallSegment";
DROP TABLE "WallSegment";
ALTER TABLE "new_WallSegment" RENAME TO "WallSegment";
CREATE INDEX "WallSegment_wallId_idx" ON "WallSegment"("wallId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
