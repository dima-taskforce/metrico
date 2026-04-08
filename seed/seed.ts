import { PrismaClient } from '@prisma/client';
import type {
  ObjectType,
  RoomType,
  RoomShape,
  WallMaterial,
  WallType,
  ElementType,
} from '@prisma/client';
import * as data from './test-apartment.json';

const prisma = new PrismaClient();

interface WallData {
  cornerFrom: string;
  cornerTo: string;
  length: number;
  material: WallMaterial;
  wallType: WallType;
  sortOrder: number;
  windows?: Array<{
    width: number;
    height: number;
    sillHeightFromScreed: number;
    revealWidthLeft?: number;
    revealWidthRight?: number;
    isFrenchDoor?: boolean;
  }>;
  doors?: Array<{
    width: number;
    heightFromScreed: number;
    revealLeft?: number;
    revealRight?: number;
  }>;
  elements?: Array<{
    elementType: ElementType;
    width?: number;
    height?: number;
    depth?: number;
    offsetFromWall?: number;
    offsetFromFloor?: number;
    cornerLabel?: string;
    description?: string;
  }>;
}

interface RoomData {
  name: string;
  type: RoomType;
  shape: RoomShape;
  ceilingHeight1?: number;
  ceilingHeight2?: number;
  sortOrder: number;
  expected: { perimeter: number; area: number; volume: number };
  walls: WallData[];
  angles: Array<{
    cornerLabel: string;
    wallAIndex: number;
    wallBIndex: number;
    isRightAngle: boolean;
  }>;
}

async function main() {
  const seedEmail = 'seed@metrico.test';

  // Upsert test user
  const user = await prisma.user.upsert({
    where: { email: seedEmail },
    update: {},
    create: {
      email: seedEmail,
      name: 'Seed User',
      passwordHash: null,
    },
  });

  // Delete existing seed project
  await prisma.project.deleteMany({ where: { userId: user.id, name: data.project.name } });

  // Create project
  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: data.project.name,
      objectType: data.project.objectType as ObjectType,
      address: data.project.address,
      defaultCeilingHeight: data.project.defaultCeilingHeight,
    },
  });

  for (const roomData of data.rooms as RoomData[]) {
    const room = await prisma.room.create({
      data: {
        projectId: project.id,
        name: roomData.name,
        type: roomData.type,
        shape: roomData.shape,
        ceilingHeight1: roomData.ceilingHeight1,
        ceilingHeight2: roomData.ceilingHeight2,
        sortOrder: roomData.sortOrder,
      },
    });

    // Create walls
    const wallIds: string[] = [];
    for (const wallData of roomData.walls) {
      const wall = await prisma.wall.create({
        data: {
          roomId: room.id,
          label: `${wallData.cornerFrom}-${wallData.cornerTo}`,
          cornerFrom: wallData.cornerFrom,
          cornerTo: wallData.cornerTo,
          length: wallData.length,
          material: wallData.material,
          wallType: wallData.wallType,
          sortOrder: wallData.sortOrder,
        },
      });
      wallIds.push(wall.id);

      // Create windows
      if (wallData.windows) {
        for (const w of wallData.windows) {
          await prisma.windowOpening.create({ data: { wallId: wall.id, ...w } });
        }
      }

      // Create doors
      if (wallData.doors) {
        for (const d of wallData.doors) {
          await prisma.doorOpening.create({ data: { wallId: wall.id, ...d } });
        }
      }

      // Create elements attached to this wall
      if (wallData.elements) {
        for (const el of wallData.elements) {
          await prisma.roomElement.create({
            data: { roomId: room.id, wallId: wall.id, ...el },
          });
        }
      }
    }

    // Create angles
    for (const angle of roomData.angles) {
      const wallAId = wallIds[angle.wallAIndex];
      const wallBId = wallIds[angle.wallBIndex];
      if (wallAId && wallBId) {
        await prisma.angle.create({
          data: {
            roomId: room.id,
            cornerLabel: angle.cornerLabel,
            wallAId,
            wallBId,
            isRightAngle: angle.isRightAngle,
          },
        });
      }
    }
  }

  console.log(`Seed complete. Project: ${project.id}`);
  console.log(`Login: ${seedEmail} (no password — use dev auth bypass)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
