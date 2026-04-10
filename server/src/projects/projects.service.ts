import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from '../storage/file-storage.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import type { Project } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FileStorageService,
  ) {}

  async findAll(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    this.assertOwnership(project, userId);
    return project;
  }

  async findOneWithDetails(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        rooms: {
          orderBy: { sortOrder: 'asc' },
          include: {
            walls: {
              orderBy: { sortOrder: 'asc' },
              include: {
                segments: { orderBy: { sortOrder: 'asc' } },
                windowOpenings: true,
                doorOpenings: true,
              },
            },
            elements: true,
            photos: { orderBy: { createdAt: 'asc' } },
            angles: true,
          },
        },
        adjacencies: true,
        floorPlanLayout: true,
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId) throw new ForbiddenException('Access denied');
    return project;
  }

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    return this.prisma.project.create({
      data: { userId, ...dto },
    });
  }

  async update(id: string, userId: string, dto: UpdateProjectDto): Promise<Project> {
    await this.findOne(id, userId);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async updateStatus(id: string, status: ProjectStatus): Promise<void> {
    await this.prisma.project.update({ where: { id }, data: { status } });
  }

  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id, userId);
    if (project.blueprintPhotoPath) {
      await this.storage.delete(project.blueprintPhotoPath);
    }
    await this.prisma.project.delete({ where: { id } });
  }

  async duplicate(id: string, userId: string): Promise<Project> {
    const source = await this.prisma.project.findUnique({
      where: { id },
      include: {
        rooms: {
          include: {
            walls: {
              include: {
                segments: true,
                windowOpenings: true,
                doorOpenings: true,
              },
            },
            elements: true,
            photos: true,
            angles: true,
          },
        },
        adjacencies: true,
        floorPlanLayout: true,
      },
    });

    if (!source) throw new NotFoundException('Project not found');
    if (source.userId !== userId) throw new ForbiddenException('Access denied');

    const roomIdMap: Record<string, string> = {};

    const newProject = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          userId,
          name: `${source.name} (копия)`,
          address: source.address,
          objectType: source.objectType,
          defaultCeilingHeight: source.defaultCeilingHeight,
          status: ProjectStatus.DRAFT,
        },
      });

      const wallIdMap: Record<string, string> = {};
      const windowIdMap: Record<string, string> = {};
      const doorIdMap: Record<string, string> = {};

      for (const room of source.rooms) {
        const newRoom = await tx.room.create({
          data: {
            projectId: created.id,
            name: room.name,
            type: room.type,
            shape: room.shape,
            ceilingHeight1: room.ceilingHeight1,
            ceilingHeight2: room.ceilingHeight2,
            sortOrder: room.sortOrder,
            isMeasured: room.isMeasured,
          },
        });
        roomIdMap[room.id] = newRoom.id;

        for (const wall of room.walls) {
          const newWall = await tx.wall.create({
            data: {
              roomId: newRoom.id,
              label: wall.label,
              cornerFrom: wall.cornerFrom,
              cornerTo: wall.cornerTo,
              length: wall.length,
              material: wall.material,
              wallType: wall.wallType,
              curvatureBottom: wall.curvatureBottom,
              curvatureMiddle: wall.curvatureMiddle,
              curvatureTop: wall.curvatureTop,
              sortOrder: wall.sortOrder,
            },
          });
          wallIdMap[wall.id] = newWall.id;

          for (const wo of wall.windowOpenings) {
            const newWo = await tx.windowOpening.create({
              data: {
                wallId: newWall.id,
                width: wo.width,
                height: wo.height,
                sillHeightFromScreed: wo.sillHeightFromScreed,
                revealWidthLeft: wo.revealWidthLeft,
                revealWidthRight: wo.revealWidthRight,
                isFrenchDoor: wo.isFrenchDoor,
              },
            });
            windowIdMap[wo.id] = newWo.id;
          }

          for (const door of wall.doorOpenings) {
            const newDoor = await tx.doorOpening.create({
              data: {
                wallId: newWall.id,
                width: door.width,
                heightFromScreed: door.heightFromScreed,
                revealLeft: door.revealLeft,
                revealRight: door.revealRight,
              },
            });
            doorIdMap[door.id] = newDoor.id;
          }

          for (const seg of wall.segments) {
            await tx.wallSegment.create({
              data: {
                wallId: newWall.id,
                sortOrder: seg.sortOrder,
                segmentType: seg.segmentType,
                length: seg.length,
                depth: seg.depth,
                description: seg.description,
                windowOpeningId: seg.windowOpeningId ? (windowIdMap[seg.windowOpeningId] ?? null) : null,
                doorOpeningId: seg.doorOpeningId ? (doorIdMap[seg.doorOpeningId] ?? null) : null,
              },
            });
          }
        }

        for (const el of room.elements) {
          await tx.roomElement.create({
            data: {
              roomId: newRoom.id,
              elementType: el.elementType,
              width: el.width,
              height: el.height,
              depth: el.depth,
              positionX: el.positionX,
              offsetFromWall: el.offsetFromWall,
              offsetFromFloor: el.offsetFromFloor,
              wallId: el.wallId ? wallIdMap[el.wallId] ?? null : null,
              cornerLabel: el.cornerLabel,
              description: el.description,
            },
          });
        }

        for (const angle of room.angles) {
          await tx.angle.create({
            data: {
              roomId: newRoom.id,
              cornerLabel: angle.cornerLabel,
              wallAId: wallIdMap[angle.wallAId] ?? angle.wallAId,
              wallBId: wallIdMap[angle.wallBId] ?? angle.wallBId,
              isRightAngle: angle.isRightAngle,
              angleDegrees: angle.angleDegrees,
            },
          });
        }
      }

      for (const adj of source.adjacencies) {
        const newWallAId = wallIdMap[adj.wallAId];
        const newWallBId = wallIdMap[adj.wallBId];
        if (!newWallAId || !newWallBId) continue;
        await tx.wallAdjacency.create({
          data: {
            wallAId: newWallAId,
            wallBId: newWallBId,
            projectId: created.id,
            hasDoorBetween: adj.hasDoorBetween,
            doorOpeningId: adj.doorOpeningId ? (doorIdMap[adj.doorOpeningId] ?? null) : null,
          },
        });
      }

      if (source.floorPlanLayout) {
        await tx.floorPlanLayout.create({
          data: {
            projectId: created.id,
            layoutJson: source.floorPlanLayout.layoutJson,
            layoutVersion: source.floorPlanLayout.layoutVersion,
            svgData: source.floorPlanLayout.svgData,
          },
        });
      }

      return created;
    });

    // Copy files (best effort — project exists even if file copy fails)
    try {
      if (source.blueprintPhotoPath) {
        const newBlueprintPath = await this.storage.copyBlueprintFile(
          id,
          newProject.id,
          source.blueprintPhotoPath,
        );
        await this.prisma.project.update({
          where: { id: newProject.id },
          data: { blueprintPhotoPath: newBlueprintPath },
        });
      }

      const filePathMap = await this.storage.copyProjectFiles(
        id,
        newProject.id,
        userId,
        roomIdMap,
      );

      for (const room of source.rooms) {
        const newRoomId = roomIdMap[room.id]!;
        for (const photo of room.photos) {
          await this.prisma.roomPhoto.create({
            data: {
              roomId: newRoomId,
              photoType: photo.photoType,
              originalPath: filePathMap[photo.originalPath] ?? photo.originalPath,
              thumbPath: photo.thumbPath
                ? (filePathMap[photo.thumbPath] ?? photo.thumbPath)
                : null,
            },
          });
        }
      }
    } catch {
      // File copy failed — project is still usable without photos
    }

    return newProject;
  }

  async uploadBlueprint(
    id: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<Project> {
    const project = await this.findOne(id, userId);

    if (project.blueprintPhotoPath) {
      await this.storage.delete(project.blueprintPhotoPath);
    }

    const filePath = await this.storage.save(file, `projects/${id}/blueprint`);
    return this.prisma.project.update({
      where: { id },
      data: { blueprintPhotoPath: filePath },
    });
  }

  async reopen(id: string, userId: string): Promise<Project> {
    const project = await this.findOne(id, userId);
    if (project.status !== ProjectStatus.COMPLETED) {
      throw new BadRequestException('Only COMPLETED projects can be reopened');
    }
    return this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.DRAFT },
    });
  }

  private assertOwnership(project: Project | null, userId: string): asserts project is Project {
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
