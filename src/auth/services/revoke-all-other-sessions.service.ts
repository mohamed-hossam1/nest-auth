import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { TokensService } from 'src/tokens/tokens.service';
import { RefreshSessionsRepository } from 'src/users/repositories/refresh-sessions.repository';

@Injectable()
export class RevokeAllOtherSessionsService {
  constructor(
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
    private readonly tokensService: TokensService,
  ) {}

  async revokeAllOtherSessions(
    userId: string,
    refreshToken?: string,
  ): Promise<{ message: string }> {
    const payload = this.tokensService.decodeRefreshToken(refreshToken);

    if (!payload || payload.sub !== userId || !payload.sid) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    await this.refreshSessionsRepository.revokeAllExcept(userId, payload.sid);

    return { message: AUTH_MESSAGES.SESSIONS_REVOKED_OTHERS_SUCCESS };
  }
}
