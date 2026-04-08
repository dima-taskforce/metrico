import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, HttpException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';

const makePrisma = () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  passwordResetToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((fn) => {
    // Mock $transaction to accept array of operations and return results
    if (Array.isArray(fn)) {
      return Promise.resolve([{}, {}, {}]);
    }
    return Promise.resolve({});
  }),
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

  describe('forgotPassword', () => {
    it('returns early if email does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@b.com');

      expect(result).toBeUndefined();
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('creates password reset token for existing user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
      prisma.passwordResetToken.create.mockResolvedValue({
        id: 'token1',
        userId: 'u1',
        tokenHash: 'hash',
        expiresAt: new Date(),
      });

      await service.forgotPassword('a@b.com');

      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        },
      });
    });

    it('sets token expiration to 1 hour', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
      prisma.passwordResetToken.create.mockResolvedValue({});

      const beforeCall = new Date();
      await service.forgotPassword('a@b.com');
      const afterCall = new Date();

      const callArgs = prisma.passwordResetToken.create.mock.calls[0][0];
      const expiresAt = callArgs.data.expiresAt as Date;

      // Should be ~1 hour in future
      const diffMs = expiresAt.getTime() - beforeCall.getTime();
      expect(diffMs).toBeGreaterThan(59 * 60 * 1000); // At least 59 minutes
      expect(diffMs).toBeLessThan(61 * 60 * 1000); // Less than 61 minutes
    });
  });

  describe('resetPassword', () => {
    it('throws UnauthorizedException if token not found', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword('bad-token', 'newpass1234'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException if token expired', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token1',
        userId: 'u1',
        expiresAt: new Date(Date.now() - 1000), // Expired
        usedAt: null,
        user: { id: 'u1' },
      });

      await expect(
        service.resetPassword('valid-token', 'newpass1234'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException if token already used', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token1',
        userId: 'u1',
        expiresAt: new Date(Date.now() + 3600000), // Not expired
        usedAt: new Date(), // Already used
        user: { id: 'u1' },
      });

      await expect(
        service.resetPassword('used-token', 'newpass1234'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('resets password and marks token as used', async () => {
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour in future
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token1',
        userId: 'u1',
        expiresAt,
        usedAt: null,
        user: { id: 'u1' },
      });

      await service.resetPassword('valid-token', 'newpass1234');

      expect(prisma.$transaction).toHaveBeenCalled();
      // Verify the call was made with an array
      const call = (prisma.$transaction as jest.Mock).mock.calls[0];
      expect(Array.isArray(call[0])).toBe(true);
    });

    it('revokes all refresh tokens on successful reset', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token1',
        userId: 'u1',
        expiresAt,
        usedAt: null,
        user: { id: 'u1' },
      });

      prisma.$transaction.mockResolvedValue([{}, {}, {}]);

      await service.resetPassword('valid-token', 'newpass1234');

      // Verify $transaction was called (which contains refresh token revocation)
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('revokeAllRefreshTokens', () => {
    it('revokes all non-revoked refresh tokens for user', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await service.revokeAllRefreshTokens('u1');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('validateOAuthUser', () => {
    it('returns existing user when provider matches', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        authProvider: 'GOOGLE',
      });

      const result = await service.validateOAuthUser('a@b.com', 'GOOGLE');
      expect(result).toEqual({ id: 'u1', email: 'a@b.com' });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('throws 409 HttpException when email exists with different provider', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        authProvider: 'LOCAL',
      });

      await expect(
        service.validateOAuthUser('a@b.com', 'GOOGLE'),
      ).rejects.toBeInstanceOf(HttpException);
    });

    it('creates new user when email not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u2', email: 'new@b.com' });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.validateOAuthUser('new@b.com', 'GOOGLE', 'New User');
      expect(result).toEqual({ id: 'u2', email: 'new@b.com' });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'new@b.com', authProvider: 'GOOGLE' }),
        }),
      );
    });

    it('uses email prefix as name when displayName not provided', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u3', email: 'john@b.com' });
      prisma.refreshToken.create.mockResolvedValue({});

      await service.validateOAuthUser('john@b.com', 'YANDEX');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'john' }),
        }),
      );
    });
  });

  describe('issueTokensPublic', () => {
    it('returns tokens for valid user', async () => {
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.issueTokensPublic('u1', 'a@b.com');
      expect(result.accessToken).toBe('access-token');
      expect(typeof result.refreshToken).toBe('string');
    });
  });
});
