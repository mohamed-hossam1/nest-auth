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
import { Roles, type User, type UserBan } from 'src/db/schema';
import { BanUserDto } from '../dtos/ban-user.dto';
import { UsersRepository } from '../repositories/users.repository';
import { RefreshSessionsRepository } from '../repositories/refresh-sessions.repository';

export type PublicBan = {
  bannedAt: Date;
  banReason: string;
};

export type PublicUserWithBan = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: User['role'];
  isVerified: boolean;
  isBanned: boolean;
  ban: PublicBan | null;
};

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
      user: this.toPublicUserWithBan(user, ban),
    };
  }

  async unban(currentUser: AuthUser, targetUserId: string) {
    this.assertAdmin(currentUser);

    const targetUser = await this.usersRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    if (!targetUser.isBanned) {
      throw new BadRequestException(AUTH_MESSAGES.USER_NOT_BANNED);
    }

    const user = await db.transaction(async (tx) => {
      return this.usersRepository.unbanUser(targetUser.id, tx);
    });

    if (!user) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    return {
      message: AUTH_MESSAGES.USER_UNBANNED_SUCCESS,
      user: this.toPublicUserWithBan(user, null),
    };
  }

  /**
   * Builds a public user profile, attaching ban details when the user is banned.
   */
  async toPublicUserProfile(user: User): Promise<PublicUserWithBan> {
    if (!user.isBanned) {
      return this.toPublicUserWithBan(user, null);
    }

    const ban = await this.usersRepository.findBanByUserId(user.id);
    return this.toPublicUserWithBan(user, ban);
  }

  toPublicUserWithBan(
    user: User,
    ban: Pick<UserBan, 'bannedAt' | 'banReason'> | null,
  ): PublicUserWithBan {
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

  private assertAdmin(currentUser: AuthUser) {
    if (currentUser.role !== Roles.ADMIN) {
      throw new ForbiddenException(AUTH_MESSAGES.FORBIDDEN);
    }
  }
}
