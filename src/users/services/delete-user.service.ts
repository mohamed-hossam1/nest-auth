import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { ROLES } from 'src/db/schema';
import { TokensService } from 'src/tokens/tokens.service';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class DeleteUserService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly tokensService: TokensService,
  ) {}

  async deleteMe(currentUser: AuthUser, res: Response) {
    return this.delete(currentUser, currentUser.id, res);
  }

  async delete(currentUser: AuthUser, targetUserId: string, res: Response) {
    const isAdmin = currentUser.role === ROLES.ADMIN;
    const isSelf = currentUser.id === targetUserId;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException(AUTH_MESSAGES.FORBIDDEN);
    }

    const deletedUser = await this.usersRepository.delete(targetUserId);

    if (!deletedUser) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    if (isSelf) {
      this.tokensService.clearRefreshTokenCookie(res);
    }

    return { message: AUTH_MESSAGES.USER_DELETED_SUCCESS };
  }
}
