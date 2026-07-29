import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AUTH_MESSAGES,
  VALIDATION_MESSAGES,
} from 'src/common/constants/messages.constant';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { db } from 'src/db';
import { ROLES } from 'src/db/schema';
import { BanUserDto } from '../dtos/ban-user.dto';
import { UsersRepository } from '../repositories/users.repository';
import { RefreshSessionsRepository } from '../repositories/refresh-sessions.repository';
import { toPublicUser } from '../utils/users.mapper';

@Injectable()
export class BanUserService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
  ) {}

  async ban(currentUser: AuthUser, targetUserId: string, dto: BanUserDto) {
    this.assertAdmin(currentUser);

    if (currentUser.id === targetUserId) {
      throw new BadRequestException(AUTH_MESSAGES.CANNOT_BAN_SELF);
    }

    const targetUser = await this.usersRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    if (targetUser.isBanned) {
      throw new BadRequestException(AUTH_MESSAGES.USER_ALREADY_BANNED);
    }

    const banReason = dto.banReason.trim();
    if (!banReason) {
      throw new BadRequestException(VALIDATION_MESSAGES.BAN_REASON_REQUIRED);
    }

    const { user, ban } = await db.transaction(async (tx) => {
      const result = await this.usersRepository.banUser(
        targetUser.id,
        banReason,
        tx,
      );

      await this.refreshSessionsRepository.revokeAll(targetUser.id, tx);

      return result;
    });

    return {
      message: AUTH_MESSAGES.USER_BANNED_SUCCESS,
      user: toPublicUser(user, ban),
    };
  }

  private assertAdmin(currentUser: AuthUser) {
    if (currentUser.role !== ROLES.ADMIN) {
      throw new ForbiddenException(AUTH_MESSAGES.FORBIDDEN);
    }
  }
}
