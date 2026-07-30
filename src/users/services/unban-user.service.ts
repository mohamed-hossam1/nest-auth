import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { db } from 'src/db';
import { UsersRepository } from '../repositories/users.repository';
import { toPublicUser } from '../utils/users.mapper';

@Injectable()
export class UnbanUserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async unban(targetUserId: string) {
    const { user, status } = await db.transaction(async (tx) => {
      return this.usersRepository.unbanUser(targetUserId, tx);
    });

    if (status === 'NOT_FOUND') {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    if (status === 'NOT_BANNED') {
      throw new BadRequestException(AUTH_MESSAGES.USER_NOT_BANNED);
    }

    if (!user) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    return {
      message: AUTH_MESSAGES.USER_UNBANNED_SUCCESS,
      user: toPublicUser(user, null),
    };
  }
}
