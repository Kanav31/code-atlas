import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  ForbiddenException,
  Headers,
} from '@nestjs/common';
import { Response } from 'express';
import { timingSafeEqual, createHash } from 'node:crypto';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { NewsletterService } from './newsletter.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class SubscribeDto {
  @IsEmail()
  email!: string;
}

class BlastDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;
}

interface AuthUser {
  id: string;
  email: string;
}

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  async subscribe(@Body() dto: SubscribeDto) {
    await this.newsletter.subscribe(dto.email);
    return { message: 'Subscribed successfully.' };
  }

  @Get('unsubscribe')
  async unsubscribe(@Query('token') token: string, @Res() res: Response) {
    await this.newsletter.unsubscribe(token);
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';
    res.redirect(`${frontendUrl}/unsubscribed`);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  getStatus(@CurrentUser() user: AuthUser) {
    return this.newsletter.getStatus(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe-me')
  @HttpCode(HttpStatus.OK)
  async subscribeMe(@CurrentUser() user: AuthUser) {
    await this.newsletter.subscribe(user.email, user.id);
    return { message: 'Subscribed successfully.' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('unsubscribe-me')
  @HttpCode(HttpStatus.OK)
  async unsubscribeMe(@CurrentUser() user: AuthUser) {
    await this.newsletter.unsubscribeByUserId(user.id);
    return { message: 'Unsubscribed successfully.' };
  }

  /**
   * Send a feature announcement to all active subscribers.
   * Protected by both JWT and an ADMIN_SECRET header so only
   * the operator can trigger a blast.
   *
   * curl -X POST http://localhost:3001/api/newsletter/blast \
   *   -H "Authorization: Bearer <token>" \
   *   -H "x-admin-secret: <ADMIN_SECRET>" \
   *   -H "Content-Type: application/json" \
   *   -d '{"title":"New: Databases module","description":"We just shipped..."}'
   */
  @UseGuards(JwtAuthGuard)
  @Post('blast')
  @HttpCode(HttpStatus.OK)
  async blast(
    @Headers('x-admin-secret') secret: string,
    @Body() dto: BlastDto,
  ) {
    const expected = process.env['ADMIN_SECRET'];
    if (!expected) throw new ForbiddenException('Invalid admin secret.');
    const a = createHash('sha256').update(secret ?? '').digest();
    const b = createHash('sha256').update(expected).digest();
    if (!timingSafeEqual(a, b)) throw new ForbiddenException('Invalid admin secret.');
    const result = await this.newsletter.blastFeatureAnnouncement(dto.title, dto.description);
    return { message: `Sent to ${result.sent} subscriber(s).`, ...result };
  }
}
