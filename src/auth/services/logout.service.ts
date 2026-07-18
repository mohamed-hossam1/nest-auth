import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { TokensService } from 'src/tokens/tokens.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class LogoutService {
  constructor(
    private readonly userService: UsersService,
    private readonly tokensService: TokensService,
  ) {}

  async logout(userId: string, res: Response) {
    await this.userService.update(userId, { refreshTokenHash: null });
    this.tokensService.clearRefreshTokenCookie(res);

    return { message: AUTH_MESSAGES.LOGOUT_SUCCESS };
  }
}
