import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { Provider } from '@prisma/client';

interface GithubProfile {
  emails?: Array<{ value: string }>;
  displayName: string;
  username: string;
  photos?: Array<{ value: string }>;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID') ?? 'github-oauth-disabled',
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET') ?? 'github-oauth-disabled',
      callbackURL: `${config.get<string>('API_URL') ?? 'http://localhost:3001'}/api/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GithubProfile,
    done: (err: Error | null, user?: unknown) => void,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('No email from GitHub'), undefined);

    const avatar = profile.photos?.[0]?.value;
    const tokens = await this.authService.handleOAuthUser({
      email,
      name: profile.displayName || profile.username,
      ...(avatar ? { avatar } : {}),
      provider: Provider.GITHUB,
    });

    done(null, tokens);
  }
}
