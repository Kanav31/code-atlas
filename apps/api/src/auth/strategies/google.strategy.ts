import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { Provider } from '@prisma/client';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') ?? 'google-oauth-disabled',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') ?? 'google-oauth-disabled',
      callbackURL: `${config.get<string>('API_URL') ?? 'http://localhost:3001'}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      emails?: Array<{ value: string }>;
      displayName: string;
      photos?: Array<{ value: string }>;
    },
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('No email from Google'), undefined);

    const avatar = profile.photos?.[0]?.value;
    const tokens = await this.authService.handleOAuthUser({
      email,
      name: profile.displayName,
      ...(avatar ? { avatar } : {}),
      provider: Provider.GOOGLE,
    });

    done(null, tokens);
  }
}
