import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { ROLES } from 'src/db/schema';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class DeleteUserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async delete(currentUser: AuthUser, targetUserId: string) {
    const isAdmin = currentUser.role === ROLES.ADMIN;

    if (!isAdmin) {
      throw new ForbiddenException(AUTH_MESSAGES.FORBIDDEN);
    }

    const deletedUser = await this.usersRepository.delete(targetUserId);

    if (!deletedUser) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    return { message: AUTH_MESSAGES.USER_DELETED_SUCCESS };
  }
}
