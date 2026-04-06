import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { NewsletterService } from '../newsletter/newsletter.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { Provider } from '@prisma/client';

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

    const verifyToken = uuidv4();
    // Store verify token temporarily — for simplicity, we send it directly in email
    // In production you'd store it in a VerifyEmailToken table
    await this.mail.sendEmailVerification(user.email, user.name, verifyToken);

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

  async forgotPassword(email: string) {
    const user = await this.users.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user || user.provider !== Provider.LOCAL) return;

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    await this.mail.sendPasswordReset(user.email, user.name, token);
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
    try {
      this.jwt.verify(refreshToken, { secret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.issueTokens(userId, email);
  }

  private async issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
    return { accessToken, refreshToken };
  }
}
