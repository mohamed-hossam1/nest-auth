import { Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { TokensService } from 'src/tokens/tokens.service';
import { RefreshSessionsRepository } from 'src/users/repositories/refresh-sessions.repository';

@Injectable()
export class RevokeSessionService {
  constructor(
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
    private readonly tokensService: TokensService,
  ) {}

  async revokeSession(
    userId: string,
    sessionId: string,
    res: Response,
    refreshToken?: string,
  ) {
    const session = await this.refreshSessionsRepository.revokeSessionForUser(
      sessionId,
      userId,
    );

    if (!session) {
      throw new NotFoundException(AUTH_MESSAGES.SESSION_NOT_FOUND);
    }

    const currentSessionId =
      await this.tokensService.getSessionIdFromRefreshToken(
        refreshToken,
        userId,
      );

    if (currentSessionId === session.id) {
      this.tokensService.clearRefreshTokenCookie(res);
    }

    return { message: AUTH_MESSAGES.SESSION_REVOKED_SUCCESS };
  }
}
