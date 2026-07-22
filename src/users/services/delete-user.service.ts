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
import { UsersService } from '../users.service';

@Injectable()
export class DeleteUserService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
  ) {}

  async delete(currentUser: AuthUser, targetUserId: string, res: Response) {
    const isAdmin = currentUser.role === Roles.ADMIN;
    const isSelf = currentUser.id === targetUserId;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException(AUTH_MESSAGES.FORBIDDEN);
    }

    const targetUser = await this.usersService.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    await this.usersService.delete(targetUser.id);

    if (isSelf) {
      this.tokensService.clearRefreshTokenCookie(res);
    }

    return { message: AUTH_MESSAGES.USER_DELETED_SUCCESS };
  }
}
