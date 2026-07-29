import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { db } from 'src/db';
import { ROLES } from 'src/db/schema';
import { UsersRepository } from '../repositories/users.repository';
import { toPublicUser } from '../utils/users.mapper';

@Injectable()
export class UnbanUserService {
  constructor(private readonly usersRepository: UsersRepository) {}

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
      user: toPublicUser(user, null),
    };
  }

  private assertAdmin(currentUser: AuthUser) {
    if (currentUser.role !== ROLES.ADMIN) {
      throw new ForbiddenException(AUTH_MESSAGES.FORBIDDEN);
    }
  }
}
