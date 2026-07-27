import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { Roles, type User } from 'src/db/schema';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UsersRepository } from '../repositories/users.repository';

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: User['role'];
  isVerified: boolean;
  isBanned: boolean;
  ban: { bannedAt: Date; banReason: string } | null;
};

@Injectable()
export class UpdateUserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async updateMe(currentUser: AuthUser, dto: UpdateUserDto) {
    return this.update(currentUser, currentUser.id, dto);
  }

  async update(
    currentUser: AuthUser,
    targetUserId: string,
    dto: UpdateUserDto,
  ) {
    const isAdmin = currentUser.role === Roles.ADMIN;
    const isSelf = currentUser.id === targetUserId;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException(AUTH_MESSAGES.FORBIDDEN);
    }

    if (dto.name === undefined && dto.avatarUrl === undefined) {
      throw new BadRequestException(AUTH_MESSAGES.NO_FIELDS_TO_UPDATE);
    }

    const targetUser = await this.usersRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    const patch: { name?: string | null; avatarUrl?: string | null } = {};
    if (dto.name !== undefined) {
      patch.name = dto.name;
    }
    if (dto.avatarUrl !== undefined) {
      patch.avatarUrl = dto.avatarUrl;
    }

    const updated = await this.usersRepository.update(targetUser.id, patch);
    if (!updated) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    return {
      message: AUTH_MESSAGES.USER_UPDATED_SUCCESS,
      user: await this.toPublicUser(updated),
    };
  }

  async toPublicUser(user: User): Promise<PublicUser> {
    const ban = user.isBanned
      ? await this.usersRepository.findBanByUserId(user.id)
      : null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isVerified: user.isVerified,
      isBanned: user.isBanned,
      ban: ban
        ? {
            bannedAt: ban.bannedAt,
            banReason: ban.banReason,
          }
        : null,
    };
  }
}
