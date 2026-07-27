import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { Roles } from 'src/db/schema';
import { TokensService } from 'src/tokens/tokens.service';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class DeleteUserService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly tokensService: TokensService,
  ) {}

  async delete(currentUser: AuthUser, targetUserId: string, res: Response) {
    const isAdmin = currentUser.role === Roles.ADMIN;
    const isSelf = currentUser.id === targetUserId;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException(AUTH_MESSAGES.FORBIDDEN);
    }

    const targetUser = await this.usersRepository.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    await this.usersRepository.delete(targetUser.id);

    if (isSelf) {
      this.tokensService.clearRefreshTokenCookie(res);
    }

    return { message: AUTH_MESSAGES.USER_DELETED_SUCCESS };
  }
}
