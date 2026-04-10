-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DoorOpening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wallId" TEXT NOT NULL,
    "width" REAL NOT NULL,
    "heightFromScreed" REAL NOT NULL,
    "revealLeft" REAL,
    "revealRight" REAL,
    "isFrenchDoor" BOOLEAN NOT NULL DEFAULT false,
    "photoPath" TEXT,
    CONSTRAINT "DoorOpening_wallId_fkey" FOREIGN KEY ("wallId") REFERENCES "Wall" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DoorOpening" ("heightFromScreed", "id", "photoPath", "revealLeft", "revealRight", "wallId", "width") SELECT "heightFromScreed", "id", "photoPath", "revealLeft", "revealRight", "wallId", "width" FROM "DoorOpening";
DROP TABLE "DoorOpening";
ALTER TABLE "new_DoorOpening" RENAME TO "DoorOpening";
CREATE INDEX "DoorOpening_wallId_idx" ON "DoorOpening"("wallId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
