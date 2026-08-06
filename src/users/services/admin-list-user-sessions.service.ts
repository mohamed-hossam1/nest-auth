import { Injectable, NotFoundException } from '@nestjs/common';
import { ADMIN_MESSAGES } from 'src/common/constants/messages.constant';
import { UsersRepository } from '../repositories/users.repository';
import { RefreshSessionsRepository } from '../repositories/refresh-sessions.repository';

@Injectable()
export class AdminListUserSessionsService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
  ) {}

  async listSessions(userId: string, page: number = 1, limit: number = 20) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(ADMIN_MESSAGES.USER_NOT_FOUND);
    }

    const { data, total } =
      await this.refreshSessionsRepository.findAllByUserId(userId, {
        page,
        limit,
      });

    const now = new Date();
    const sessions = data.map((session) => ({
      sessionId: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      status: session.revokedAt
        ? ('revoked' as const)
        : session.expiresAt < now
          ? ('expired' as const)
          : ('active' as const),
      createdAt: session.createdAt.toISOString(),
      lastUsedAt:
        session.updatedAt?.toISOString() ?? session.createdAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString() ?? null,
      expiresAt: session.expiresAt.toISOString(),
    }));

    return {
      sessions,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
