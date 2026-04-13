import { VkStrategy } from './vk.strategy';
import { AuthService } from '../auth.service';

const mockAuthService = {
  validateOAuthUser: jest.fn(),
};

describe('VkStrategy', () => {
  let strategy: VkStrategy;

  beforeEach(() => {
    process.env['VK_CLIENT_ID'] = 'test_id';
    process.env['VK_CLIENT_SECRET'] = 'test_secret';
    strategy = new VkStrategy(mockAuthService as unknown as AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env['VK_CLIENT_ID'];
    delete process.env['VK_CLIENT_SECRET'];
  });

  it('calls done with user when email from params', async () => {
    const mockUser = { id: 'user-1', email: 'test@vk.com' };
    mockAuthService.validateOAuthUser.mockResolvedValueOnce(mockUser);

    const done = jest.fn();
    await strategy.validate(
      'access_token',
      'refresh_token',
      { email: 'test@vk.com' },
      { displayName: 'Test User' },
      done,
    );

    expect(mockAuthService.validateOAuthUser).toHaveBeenCalledWith(
      'test@vk.com',
      'VK',
      'Test User',
    );
    expect(done).toHaveBeenCalledWith(null, mockUser);
  });

  it('falls back to profile.emails when params.email is missing', async () => {
    const mockUser = { id: 'user-2', email: 'fallback@vk.com' };
    mockAuthService.validateOAuthUser.mockResolvedValueOnce(mockUser);

    const done = jest.fn();
    await strategy.validate(
      'access_token',
      'refresh_token',
      {},
      { displayName: 'Fallback User', emails: [{ value: 'fallback@vk.com' }] },
      done,
    );

    expect(mockAuthService.validateOAuthUser).toHaveBeenCalledWith(
      'fallback@vk.com',
      'VK',
      'Fallback User',
    );
    expect(done).toHaveBeenCalledWith(null, mockUser);
  });

  it('calls done with error when no email available', async () => {
    const done = jest.fn();
    await strategy.validate('access_token', 'refresh_token', {}, {}, done);

    expect(mockAuthService.validateOAuthUser).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(expect.any(Error));
    expect((done.mock.calls[0][0] as Error).message).toMatch(/email/i);
  });

  it('calls done with error when validateOAuthUser throws', async () => {
    const error = new Error('Provider conflict');
    mockAuthService.validateOAuthUser.mockRejectedValueOnce(error);

    const done = jest.fn();
    await strategy.validate(
      'access_token',
      'refresh_token',
      { email: 'test@vk.com' },
      { displayName: 'Test' },
      done,
    );

    expect(done).toHaveBeenCalledWith(error);
  });

  it('uses dummy credentials when env vars not set', () => {
    delete process.env['VK_CLIENT_ID'];
    delete process.env['VK_CLIENT_SECRET'];
    // Should not throw — strategy initializes with disabled placeholder
    expect(() => new VkStrategy(mockAuthService as unknown as AuthService)).not.toThrow();
  });
});
