import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    const clientID = process.env['GOOGLE_CLIENT_ID'];
    const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
    if (!clientID || !clientSecret) {
      // Provide dummy values so Passport doesn't throw at startup;
      // OAuth routes will return 503 via the guard.
      super({ clientID: 'disabled', clientSecret: 'disabled', callbackURL: '/api/auth/google/callback', scope: ['email', 'profile'] });
      return;
    }
    super({
      clientID,
      clientSecret,
      callbackURL: process.env['GOOGLE_CALLBACK_URL'] ?? '/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: { id: string; emails?: { value: string }[]; displayName?: string },
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('No email from Google'), undefined);
      return;
    }
    try {
      const user = await this.authService.validateOAuthUser(email, 'GOOGLE', profile.displayName);
      done(null, user);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
