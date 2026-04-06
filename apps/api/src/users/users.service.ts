import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Provider } from '@prisma/client';

interface CreateUserInput {
  name: string;
  email: string;
  provider: Provider;
  passwordHash?: string;
  avatar?: string;
  emailVerified?: boolean;
}

interface UpdateUserInput {
  name?: string;
  avatar?: string;
  passwordHash?: string;
  emailVerified?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: CreateUserInput) {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: UpdateUserInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
