import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AUTH_MESSAGES,
  VALIDATION_MESSAGES,
} from 'src/common/constants/messages.constant';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { db } from 'src/db';
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
    if (currentUser.id === targetUserId) {
      throw new BadRequestException(AUTH_MESSAGES.CANNOT_BAN_SELF);
    }

    const banReason = dto.banReason.trim();
    if (!banReason) {
      throw new BadRequestException(VALIDATION_MESSAGES.BAN_REASON_REQUIRED);
    }

    try {
      const { user, ban } = await db.transaction(async (tx) => {
        const result = await this.usersRepository.banUser(
          targetUserId,
          banReason,
          tx,
        );

        await this.refreshSessionsRepository.revokeAll(targetUserId, tx);

        return result;
      });

      return {
        message: AUTH_MESSAGES.USER_BANNED_SUCCESS,
        user: toPublicUser(user, ban),
      };
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new BadRequestException(AUTH_MESSAGES.USER_ALREADY_BANNED);
      }
      if (error?.code === '23503') {
        throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
      }
      throw error;
    }
  }
}
