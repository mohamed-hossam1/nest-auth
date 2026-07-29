import { Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { TokensService } from 'src/tokens/tokens.service';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class DeleteMeService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly tokensService: TokensService,
  ) {}

  async deleteMe(currentUser: AuthUser, res: Response) {
    const deletedUser = await this.usersRepository.delete(currentUser.id);

    if (!deletedUser) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    this.tokensService.clearRefreshTokenCookie(res);

    return { message: AUTH_MESSAGES.USER_DELETED_SUCCESS };
  }
}
