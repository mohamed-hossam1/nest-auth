import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import type { RefreshSession } from 'src/db/schema';
import { TokensService } from 'src/tokens/tokens.service';
import { RefreshSessionsRepository } from 'src/users/repositories/refresh-sessions.repository';
import type { SessionResponseDto } from '../dtos/session-response.dto';
import { parseUserAgent } from '../utils/user-agent.util';

@Injectable()
export class SessionsService {
  constructor(
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
    private readonly tokensService: TokensService,
  ) {}

  async listSessions(
    userId: string,
    refreshToken?: string,
  ): Promise<{ sessions: SessionResponseDto[] }> {
    const [sessions, currentSessionId] = await Promise.all([
      this.refreshSessionsRepository.findActiveByUserId(userId),
      this.tokensService.getSessionIdFromRefreshToken(refreshToken, userId),
    ]);

    return {
      sessions: sessions.map((session) =>
        this.toSessionResponse(session, currentSessionId),
      ),
    };
  }

  async revokeSession(
    userId: string,
    sessionId: string,
    res: Response,
    refreshToken?: string,
  ) {
    const session = await this.refreshSessionsRepository.findActiveForUser(
      sessionId,
      userId,
    );

    if (!session) {
      throw new NotFoundException(AUTH_MESSAGES.SESSION_NOT_FOUND);
    }

    await this.refreshSessionsRepository.update(session.id, {
      revokedAt: new Date(),
    });

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

  async revokeAllOtherSessions(
    userId: string,
    refreshToken?: string,
  ): Promise<{ message: string }> {
    const currentSessionId =
      await this.tokensService.getSessionIdFromRefreshToken(
        refreshToken,
        userId,
      );

    if (!currentSessionId) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    await this.refreshSessionsRepository.revokeAllExcept(
      userId,
      currentSessionId,
    );

    return { message: AUTH_MESSAGES.SESSIONS_REVOKED_OTHERS_SUCCESS };
  }

  private toSessionResponse(
    session: RefreshSession,
    currentSessionId: string | null,
  ): SessionResponseDto {
    const { browser, operatingSystem } = parseUserAgent(session.userAgent);

    return {
      sessionId: session.id,
      deviceName: session.deviceName,
      browser,
      operatingSystem,
      ipAddress: session.ipAddress,
      location: null,
      createdAt: session.createdAt,
      lastUsedAt: session.updatedAt ?? session.createdAt,
      isCurrentSession: currentSessionId === session.id,
    };
  }
}
