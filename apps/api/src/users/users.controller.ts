import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

interface AuthUser {
  id: string;
  email: string;
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: AuthUser) {
    const found = await this.users.findById(user.id);
    if (!found) return null;
    const { passwordHash: _ph, ...safe } = found;
    return safe;
  }

  @Patch('me')
  async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    const updated = await this.users.update(user.id, dto);
    const { passwordHash: _ph, ...safe } = updated;
    return safe;
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    const found = await this.users.findById(user.id);
    if (!found?.passwordHash) {
      throw new BadRequestException('Password change is not available for OAuth accounts.');
    }
    const valid = await bcrypt.compare(dto.currentPassword, found.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect.');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.users.update(user.id, { passwordHash });
    return { message: 'Password updated successfully.' };
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser() user: AuthUser) {
    await this.users.delete(user.id);
  }
}
