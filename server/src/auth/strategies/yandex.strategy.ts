import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-yandex';
import { AuthService } from '../auth.service';

@Injectable()
export class YandexStrategy extends PassportStrategy(Strategy, 'yandex') {
  constructor(private readonly authService: AuthService) {
    const clientID = process.env['YANDEX_CLIENT_ID'];
    const clientSecret = process.env['YANDEX_CLIENT_SECRET'];
    if (!clientID || !clientSecret) {
      super({ clientID: 'disabled', clientSecret: 'disabled', callbackURL: '/api/auth/yandex/callback' });
      return;
    }
    super({
      clientID,
      clientSecret,
      callbackURL: process.env['YANDEX_CALLBACK_URL'] ?? '/api/auth/yandex/callback',
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: Error | null, user?: unknown) => void,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('No email from Yandex'));
      return;
    }
    try {
      const user = await this.authService.validateOAuthUser(email, 'YANDEX', profile.displayName);
      done(null, user);
    } catch (err) {
      done(err as Error);
    }
  }
}
