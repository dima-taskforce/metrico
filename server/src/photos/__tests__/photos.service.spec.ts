import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PhotoType } from '@prisma/client';
import { PhotosService } from '../photos.service';
import { PrismaService } from '../../prisma/prisma.service';

const NOW = new Date();

// Mock sharp
const mockSharpInstance = {
  rotate: jest.fn().mockReturnThis(),
  withMetadata: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  resize: jest.fn().mockReturnThis(),
  toFile: jest.fn().mockResolvedValue({}),
};
jest.mock('sharp', () => jest.fn(() => mockSharpInstance));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

const makePhoto = (overrides = {}) => ({
  id: 'ph1',
  roomId: 'r1',
  photoType: PhotoType.GENERAL,
  filePath: 'uploads/photos/u1/p1/r1/abc.jpg',
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeRoomWithAccess = (userId = 'u1') => ({
  id: 'r1',
  project: { userId, id: 'p1' },
});

const makeFile = (mimetype = 'image/jpeg', size = 1024 * 1024): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'test.jpg',
  encoding: '7bit',
  mimetype,
  size,
  buffer: Buffer.from('fake-image-data'),
  stream: null as unknown as NodeJS.ReadableStream,
  destination: '',
  filename: '',
  path: '',
});

const makePrisma = () => ({
  room: { findUnique: jest.fn() },
  roomPhoto: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
});

describe('PhotosService', () => {
  let service: PhotosService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(PhotosService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all photos for a room', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.roomPhoto.findMany.mockResolvedValue([makePhoto()]);

      const result = await service.findAll('r1', 'u1');
      expect(result).toHaveLength(1);
    });

    it('throws NotFoundException when room not found', async () => {
      prisma.room.findUnique.mockResolvedValue(null);
      await expect(service.findAll('r1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for wrong user', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess('other'));
      await expect(service.findAll('r1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── upload ──────────────────────────────────────────────────────────────

  describe('upload', () => {
    it('uploads a valid JPEG photo and creates DB record', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.roomPhoto.create.mockResolvedValue(makePhoto());

      const file = makeFile('image/jpeg');
      const result = await service.upload('r1', 'u1', file, PhotoType.GENERAL);

      expect(result.photoType).toBe(PhotoType.GENERAL);
      expect(prisma.roomPhoto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roomId: 'r1', photoType: PhotoType.GENERAL }),
        }),
      );
    });

    it('uploads a PNG photo', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.roomPhoto.create.mockResolvedValue(makePhoto());

      const file = makeFile('image/png');
      await expect(service.upload('r1', 'u1', file, PhotoType.GENERAL)).resolves.toBeDefined();
    });

    it('throws BadRequestException for unsupported MIME type', async () => {
      const file = makeFile('image/gif');
      await expect(service.upload('r1', 'u1', file, PhotoType.GENERAL)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for PDF file', async () => {
      const file = makeFile('application/pdf');
      await expect(service.upload('r1', 'u1', file, PhotoType.GENERAL)).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException for wrong user', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess('other'));
      const file = makeFile('image/jpeg');
      await expect(service.upload('r1', 'u1', file, PhotoType.GENERAL)).rejects.toThrow(ForbiddenException);
    });

    it('calls sharp to process the image (EXIF strip + auto-orient)', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.roomPhoto.create.mockResolvedValue(makePhoto());

      const file = makeFile('image/jpeg');
      await service.upload('r1', 'u1', file, PhotoType.GENERAL);

      expect(mockSharpInstance.rotate).toHaveBeenCalled();
      expect(mockSharpInstance.withMetadata).toHaveBeenCalledWith({ exif: {} });
      expect(mockSharpInstance.toFile).toHaveBeenCalled();
    });

    it('creates thumbnail (resize called for thumbnail)', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.roomPhoto.create.mockResolvedValue(makePhoto());

      const file = makeFile('image/jpeg');
      await service.upload('r1', 'u1', file, PhotoType.GENERAL);

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(400);
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes photo from DB and file system', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.roomPhoto.findUnique.mockResolvedValue(makePhoto());
      prisma.roomPhoto.delete.mockResolvedValue(makePhoto());

      // fs/promises.unlink is mocked globally
      await service.remove('r1', 'ph1', 'u1');
      expect(prisma.roomPhoto.delete).toHaveBeenCalledWith({ where: { id: 'ph1' } });
    });

    it('throws NotFoundException when photo not found', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.roomPhoto.findUnique.mockResolvedValue(null);
      await expect(service.remove('r1', 'ph1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when photo belongs to different room', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.roomPhoto.findUnique.mockResolvedValue(makePhoto({ roomId: 'other-room' }));
      await expect(service.remove('r1', 'ph1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for wrong user', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess('other'));
      await expect(service.remove('r1', 'ph1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });
});
