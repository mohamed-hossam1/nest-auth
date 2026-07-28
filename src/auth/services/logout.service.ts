import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { TokensService } from 'src/tokens/tokens.service';

@Injectable()
export class LogoutService {
  constructor(private readonly tokensService: TokensService) {}

  logout(userId: string, res: Response, refreshToken?: string) {
    void this.tokensService
      .revokeCurrentSession(refreshToken, userId)
      .catch(() => undefined);
    this.tokensService.clearRefreshTokenCookie(res);

    return { message: AUTH_MESSAGES.LOGOUT_SUCCESS };
  }
}
