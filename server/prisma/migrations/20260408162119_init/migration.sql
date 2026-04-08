-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "authProvider" TEXT NOT NULL DEFAULT 'LOCAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "objectType" TEXT NOT NULL,
    "defaultCeilingHeight" REAL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "blueprintPhotoPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "shape" TEXT NOT NULL,
    "ceilingHeight1" REAL,
    "ceilingHeight2" REAL,
    "sortOrder" INTEGER NOT NULL,
    "isMeasured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Room_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Wall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cornerFrom" TEXT NOT NULL,
    "cornerTo" TEXT NOT NULL,
    "length" REAL NOT NULL,
    "material" TEXT NOT NULL DEFAULT 'CONCRETE',
    "wallType" TEXT NOT NULL DEFAULT 'INTERNAL',
    "curvatureBottom" REAL,
    "curvatureMiddle" REAL,
    "curvatureTop" REAL,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "Wall_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WallSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wallId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "segmentType" TEXT NOT NULL,
    "length" REAL NOT NULL,
    "depth" REAL,
    "description" TEXT,
    "windowOpeningId" TEXT,
    "doorOpeningId" TEXT,
    CONSTRAINT "WallSegment_wallId_fkey" FOREIGN KEY ("wallId") REFERENCES "Wall" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WallSegment_windowOpeningId_fkey" FOREIGN KEY ("windowOpeningId") REFERENCES "WindowOpening" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WallSegment_doorOpeningId_fkey" FOREIGN KEY ("doorOpeningId") REFERENCES "DoorOpening" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WallElevation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wallId" TEXT NOT NULL,
    "svgData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WallElevation_wallId_fkey" FOREIGN KEY ("wallId") REFERENCES "Wall" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WallAdjacency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wallAId" TEXT NOT NULL,
    "wallBId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "hasDoorBetween" BOOLEAN NOT NULL DEFAULT false,
    "doorOpeningId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WallAdjacency_wallAId_fkey" FOREIGN KEY ("wallAId") REFERENCES "Wall" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WallAdjacency_wallBId_fkey" FOREIGN KEY ("wallBId") REFERENCES "Wall" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WallAdjacency_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WallAdjacency_doorOpeningId_fkey" FOREIGN KEY ("doorOpeningId") REFERENCES "DoorOpening" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WindowOpening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wallId" TEXT NOT NULL,
    "width" REAL NOT NULL,
    "height" REAL NOT NULL,
    "sillHeightFromScreed" REAL NOT NULL,
    "revealWidthLeft" REAL,
    "revealWidthRight" REAL,
    "isFrenchDoor" BOOLEAN NOT NULL DEFAULT false,
    "photoPath" TEXT,
    CONSTRAINT "WindowOpening_wallId_fkey" FOREIGN KEY ("wallId") REFERENCES "Wall" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DoorOpening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wallId" TEXT NOT NULL,
    "width" REAL NOT NULL,
    "heightFromScreed" REAL NOT NULL,
    "revealLeft" REAL,
    "revealRight" REAL,
    "photoPath" TEXT,
    CONSTRAINT "DoorOpening_wallId_fkey" FOREIGN KEY ("wallId") REFERENCES "Wall" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomElement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "elementType" TEXT NOT NULL,
    "width" REAL,
    "height" REAL,
    "depth" REAL,
    "positionX" REAL,
    "offsetFromWall" REAL,
    "offsetFromFloor" REAL,
    "wallId" TEXT,
    "cornerLabel" TEXT,
    "description" TEXT,
    "photoPath" TEXT,
    CONSTRAINT "RoomElement_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomElement_wallId_fkey" FOREIGN KEY ("wallId") REFERENCES "Wall" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "photoType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomPhoto_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Angle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "cornerLabel" TEXT NOT NULL,
    "wallAId" TEXT NOT NULL,
    "wallBId" TEXT NOT NULL,
    "isRightAngle" BOOLEAN NOT NULL DEFAULT true,
    "angleDegrees" REAL,
    "photoPath" TEXT,
    CONSTRAINT "Angle_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Angle_wallAId_fkey" FOREIGN KEY ("wallAId") REFERENCES "Wall" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Angle_wallBId_fkey" FOREIGN KEY ("wallBId") REFERENCES "Wall" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FloorPlanLayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "layoutJson" TEXT NOT NULL,
    "layoutVersion" INTEGER NOT NULL DEFAULT 1,
    "svgData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FloorPlanLayout_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Room_projectId_idx" ON "Room"("projectId");

-- CreateIndex
CREATE INDEX "Wall_roomId_idx" ON "Wall"("roomId");

-- CreateIndex
CREATE INDEX "WallSegment_wallId_idx" ON "WallSegment"("wallId");

-- CreateIndex
CREATE UNIQUE INDEX "WallElevation_wallId_key" ON "WallElevation"("wallId");

-- CreateIndex
CREATE INDEX "WallAdjacency_projectId_idx" ON "WallAdjacency"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WallAdjacency_wallAId_wallBId_key" ON "WallAdjacency"("wallAId", "wallBId");

-- CreateIndex
CREATE INDEX "WindowOpening_wallId_idx" ON "WindowOpening"("wallId");

-- CreateIndex
CREATE INDEX "DoorOpening_wallId_idx" ON "DoorOpening"("wallId");

-- CreateIndex
CREATE INDEX "RoomElement_roomId_idx" ON "RoomElement"("roomId");

-- CreateIndex
CREATE INDEX "RoomElement_wallId_idx" ON "RoomElement"("wallId");

-- CreateIndex
CREATE INDEX "RoomPhoto_roomId_idx" ON "RoomPhoto"("roomId");

-- CreateIndex
CREATE INDEX "Angle_roomId_idx" ON "Angle"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "FloorPlanLayout_projectId_key" ON "FloorPlanLayout"("projectId");
