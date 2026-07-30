import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { TokensService, RefreshJwtPayload } from 'src/tokens/tokens.service';
import { RefreshSessionsRepository } from 'src/users/repositories/refresh-sessions.repository';
import { compareSha256 } from 'src/common/utils/sha256.util';

@Injectable()
export class RevokeAllOtherSessionsService {
  constructor(
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
    private readonly tokensService: TokensService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async revokeAllOtherSessions(
    userId: string,
    refreshToken?: string,
  ): Promise<{ message: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    let payload: RefreshJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(
        refreshToken,
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    if (!payload.sid || payload.sub !== userId) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    const session = await this.refreshSessionsRepository.findById(payload.sid);

    if (
      !session ||
      session.userId !== userId ||
      session.revokedAt ||
      new Date(session.expiresAt).getTime() < Date.now()
    ) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    const isValid = compareSha256(refreshToken, session.tokenHash);
    if (!isValid) {
      await this.refreshSessionsRepository.update(session.id, {
        revokedAt: new Date(),
      });
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    await this.refreshSessionsRepository.revokeAllExcept(userId, payload.sid);

    return { message: AUTH_MESSAGES.SESSIONS_REVOKED_OTHERS_SUCCESS };
  }
}
