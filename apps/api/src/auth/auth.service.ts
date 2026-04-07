import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { NewsletterService } from '../newsletter/newsletter.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { Provider } from '@prisma/client';

const REFRESH_TOKEN_TTL_DAYS = 30;
const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly newsletter: NewsletterService,
    private readonly prisma: PrismaService,
  ) {}

  async validateLocalUser(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (!user.emailVerified) {
      throw new UnauthorizedException('email_not_verified');
    }
    return user;
  }

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      provider: Provider.LOCAL,
    });

    await this.createAndSendVerificationToken(user.id, user.email, user.name);

    if (dto.subscribeNewsletter) {
      await this.newsletter.subscribe(user.email, user.id);
    }

    return this.issueTokens(user.id, user.email);
  }

  async loginUser(userId: string, email: string) {
    return this.issueTokens(userId, email);
  }

  async handleOAuthUser(profile: {
    email: string;
    name: string;
    avatar?: string;
    provider: Provider;
  }) {
    let user = await this.users.findByEmail(profile.email);
    if (!user) {
      user = await this.users.create({
        ...profile,
        emailVerified: true,
      });
    }
    return this.issueTokens(user.id, user.email);
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.verifyEmailToken.findUnique({ where: { token } });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification link');
    }
    await this.users.update(record.userId, { emailVerified: true });
    await this.prisma.verifyEmailToken.deleteMany({ where: { userId: record.userId } });
  }

  async resendVerification(userId: string, email: string) {
    const user = await this.users.findById(userId);
    if (!user || user.emailVerified) return;
    await this.createAndSendVerificationToken(userId, email, user.name);
  }

  async forgotPassword(email: string) {
    const user = await this.users.findByEmail(email);
    if (!user || user.provider !== Provider.LOCAL) return;

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    void this.mail.sendPasswordReset(user.email, user.name, token);
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.users.update(reset.userId, { passwordHash });
    await this.prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    });
  }

  async refreshTokens(userId: string, email: string, refreshToken: string) {
    const secret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');

    // Verify JWT signature and expiry
    try {
      this.jwt.verify(refreshToken, { secret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify token exists in DB (rotation check — each token is single-use)
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    // Delete used token (rotation — prevents replay attacks)
    await this.prisma.refreshToken.delete({ where: { tokenHash } });

    return this.issueTokens(userId, email);
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return;
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  private async createAndSendVerificationToken(userId: string, email: string, name: string) {
    await this.prisma.verifyEmailToken.deleteMany({ where: { userId } });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.verifyEmailToken.create({
      data: { userId, token, expiresAt },
    });

    void this.mail.sendEmailVerification(email, name, token);
  }

  private async issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload); // 15 min (configured in module)

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
    });

    // Store hashed refresh token in DB for rotation
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
