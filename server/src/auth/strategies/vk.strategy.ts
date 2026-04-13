import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-vkontakte';
import { AuthService } from '../auth.service';

@Injectable()
export class VkStrategy extends PassportStrategy(Strategy, 'vkontakte') {
  constructor(private readonly authService: AuthService) {
    const clientID = process.env['VK_CLIENT_ID'];
    const clientSecret = process.env['VK_CLIENT_SECRET'];
    if (!clientID || !clientSecret) {
      super({
        clientID: 'disabled',
        clientSecret: 'disabled',
        callbackURL: '/api/auth/vk/callback',
        apiVersion: '5.131',
      });
      return;
    }
    super({
      clientID,
      clientSecret,
      callbackURL: process.env['VK_CALLBACK_URL'] ?? '/api/auth/vk/callback',
      scope: ['email'],
      apiVersion: '5.131',
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    params: { email?: string },
    profile: { displayName?: string; emails?: Array<{ value: string }> },
    done: (err: Error | null, user?: unknown) => void,
  ): Promise<void> {
    // VK passes email in the token response params, not the profile
    const email = params.email ?? profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('VK не предоставил email. Убедитесь, что в приложении запрошен доступ к email.'));
      return;
    }
    try {
      const user = await this.authService.validateOAuthUser(email, 'VK', profile.displayName);
      done(null, user);
    } catch (err) {
      done(err as Error);
    }
  }
}
