import { Injectable } from '@nestjs/common';
import type { RefreshSession } from 'src/db/schema';
import { TokensService } from 'src/tokens/tokens.service';
import { RefreshSessionsRepository } from 'src/users/repositories/refresh-sessions.repository';
import type { SessionResponseDto } from '../dtos/session-response.dto';
import { parseUserAgent } from '../utils/user-agent.util';

@Injectable()
export class ListSessionsService {
  constructor(
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
    private readonly tokensService: TokensService,
  ) {}

  async listSessions(
    userId: string,
    refreshToken?: string,
  ): Promise<{ sessions: SessionResponseDto[] }> {
    const currentSessionId =
      await this.tokensService.getSessionIdFromRefreshToken(
        refreshToken,
        userId,
      );

    const sessions =
      await this.refreshSessionsRepository.findActiveByUserId(userId);

    return {
      sessions: sessions.map((session) =>
        this.toSessionResponse(session, currentSessionId),
      ),
    };
  }

  private toSessionResponse(
    session: RefreshSession,
    currentSessionId: string | null,
  ): SessionResponseDto {
    const { browser, operatingSystem } = parseUserAgent(session.userAgent);

    return {
      sessionId: session.id,
      deviceName: session.deviceName,
      userAgent: session.userAgent,
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
