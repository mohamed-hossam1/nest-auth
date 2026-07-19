import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { TokensService } from 'src/tokens/tokens.service';

@Injectable()
export class LogoutService {
  constructor(private readonly tokensService: TokensService) {}

  async logout(userId: string, res: Response, refreshToken?: string) {
    await this.tokensService.revokeCurrentSession(refreshToken, userId);
    this.tokensService.clearRefreshTokenCookie(res);

    return { message: AUTH_MESSAGES.LOGOUT_SUCCESS };
  }

  async logoutAll(userId: string, res: Response) {
    await this.tokensService.revokeAllSessions(userId);
    this.tokensService.clearRefreshTokenCookie(res);

    return { message: AUTH_MESSAGES.LOGOUT_SUCCESS };
  }
}
