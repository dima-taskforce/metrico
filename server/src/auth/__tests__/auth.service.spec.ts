import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';

const makePrisma = () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrisma>;
  let jwtService: JwtService;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('access-token') },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('throws ConflictException when email taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1' });
      await expect(
        service.register({ email: 'a@b.com', name: 'A', password: 'pass1234' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates user and returns tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'uid', email: 'a@b.com', name: 'A' });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({ email: 'a@b.com', name: 'A', password: 'pass1234' });

      expect(result.accessToken).toBe('access-token');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken.length).toBeGreaterThan(0);
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@y.com', password: 'pass1234' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('correct', 1);
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'a@b.com', passwordHash: hash });
      await expect(
        service.login({ email: 'a@b.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns tokens on correct credentials', async () => {
      const hash = await bcrypt.hash('pass1234', 1);
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'a@b.com', passwordHash: hash });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: 'a@b.com', password: 'pass1234' });
      expect(result.accessToken).toBe('access-token');
      expect(typeof result.refreshToken).toBe('string');
    });
  });

  describe('refresh', () => {
    it('throws if token not found', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('bad-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws if token is revoked', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
      });
      await expect(service.refresh('token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rotates token and returns new pair', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100_000),
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('valid-token');
      expect(result.accessToken).toBe('access-token');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revokedAt: expect.any(Date) } }),
      );
    });
  });
});
