import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockResponse = {
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const mockRequest = {
    cookies: {
      refresh_token: 'test-refresh-token',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register user and set cookies', async () => {
      const dto = { email: 'test@test.com', name: 'Test', password: 'pass1234' };
      (service.register as jest.Mock).mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      const result = await controller.register(dto, mockResponse as any);

      expect(result.message).toBe('Registered successfully');
      expect(service.register).toHaveBeenCalledWith(dto);
      expect(mockResponse.cookie).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user and set cookies', async () => {
      const dto = { email: 'test@test.com', password: 'pass1234' };
      (service.login as jest.Mock).mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      const result = await controller.login(dto, mockResponse as any);

      expect(result.message).toBe('Logged in successfully');
      expect(service.login).toHaveBeenCalledWith(dto);
      expect(mockResponse.cookie).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should return success message and call service', async () => {
      const dto = { email: 'test@test.com' };
      (service.forgotPassword as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.forgotPassword(dto);

      expect(result.message).toBe('If email exists, reset instructions have been sent');
      expect(service.forgotPassword).toHaveBeenCalledWith('test@test.com');
    });

    it('should return same message for nonexistent email (security)', async () => {
      const dto = { email: 'nonexistent@test.com' };
      (service.forgotPassword as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.forgotPassword(dto);

      expect(result.message).toBe('If email exists, reset instructions have been sent');
      expect(service.forgotPassword).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password and return success message', async () => {
      const dto = { token: 'reset-token', newPassword: 'newpass1234' };
      (service.resetPassword as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.resetPassword(dto);

      expect(result.message).toBe('Password reset successfully');
      expect(service.resetPassword).toHaveBeenCalledWith('reset-token', 'newpass1234');
    });

    it('should pass through service errors', async () => {
      const dto = { token: 'bad-token', newPassword: 'newpass1234' };
      (service.resetPassword as jest.Mock).mockRejectedValue(
        new Error('Invalid reset token'),
      );

      await expect(controller.resetPassword(dto)).rejects.toThrow('Invalid reset token');
    });
  });

  describe('logout', () => {
    it('should logout user and clear cookies', async () => {
      (service.logout as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.logout(mockRequest as any, mockResponse as any);

      expect(result.message).toBe('Logged out');
      expect(service.logout).toHaveBeenCalledWith('test-refresh-token');
      expect(mockResponse.clearCookie).toHaveBeenCalled();
    });

    it('should clear cookies even if no refresh token', async () => {
      const requestWithoutToken = { cookies: {} };
      (service.logout as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.logout(requestWithoutToken as any, mockResponse as any);

      expect(result.message).toBe('Logged out');
      expect(mockResponse.clearCookie).toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('should return current user info', () => {
      const user = { sub: 'u1', email: 'test@test.com' };

      const result = controller.me(user as any);

      expect(result.userId).toBe('u1');
      expect(result.email).toBe('test@test.com');
    });
  });

  describe('refresh', () => {
    it('should refresh tokens and set cookies', async () => {
      (service.refresh as jest.Mock).mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const result = await controller.refresh(mockRequest as any, mockResponse as any);

      expect(result.message).toBe('Tokens refreshed');
      expect(service.refresh).toHaveBeenCalledWith('test-refresh-token');
      expect(mockResponse.cookie).toHaveBeenCalled();
    });

    it('should return 401 if no refresh token', async () => {
      const requestWithoutToken = { cookies: {} };

      await controller.refresh(requestWithoutToken as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });
});
