import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { assertUserNotBanned } from 'src/common/utils/ban.util';
import { UserWithRole, type UserRole } from 'src/db/schema';
import { hashSha256 } from 'src/common/utils/sha256.util';
import { UsersRepository } from 'src/users/repositories/users.repository';
import { RefreshSessionsRepository } from 'src/users/repositories/refresh-sessions.repository';

export type JwtPayload = {
  sub: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type RefreshJwtPayload = JwtPayload & {
  sid: string;
};

export type SessionMeta = {
  userAgent?: string | null;
  ipAddress?: string | null;
};

@Injectable()
export class TokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersRepository: UsersRepository,
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
  ) {}

  getRefreshTokenTtlMs(): number {
    const raw =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const match = /^(\d+)([smhd])$/.exec(raw.trim());

    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private buildAccessPayload(user: UserWithRole): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async generateAccessToken(user: UserWithRole): Promise<string> {
    return this.jwtService.signAsync(this.buildAccessPayload(user), {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
    });
  }

  async generateRefreshToken(
    user: UserWithRole,
    sessionId: string,
  ): Promise<string> {
    const payload: RefreshJwtPayload = {
      ...this.buildAccessPayload(user),
      sid: sessionId,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });
  }

  setRefreshTokenToCookie(res: Response, refreshToken: string) {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: this.getRefreshTokenTtlMs(),
    });
  }

  clearRefreshTokenCookie(res: Response) {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
    });
  }

  async issueAuthSession(
    user: UserWithRole,
    res: Response,
    message: string,
    meta: SessionMeta = {},
  ) {
    if (user.isBanned) {
      const ban = await this.usersRepository.findBanByUserId(user.id);
      assertUserNotBanned({
        isBanned: true,
        banReason: ban?.banReason,
      });
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + this.getRefreshTokenTtlMs());
    const refreshToken = await this.generateRefreshToken(user, sessionId);
    const accessToken = await this.generateAccessToken(user);
    const refreshTokenHash = hashSha256(refreshToken);

    const userAgent = meta.userAgent ?? null;
    const ipAddress = meta.ipAddress ?? null;

    await this.refreshSessionsRepository.create({
      id: sessionId,
      userId: user.id,
      tokenHash: refreshTokenHash,
      userAgent,
      ipAddress,
      expiresAt,
    });

    this.setRefreshTokenToCookie(res, refreshToken);

    return {
      message,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    };
  }

  async getSessionIdFromRefreshToken(
    refreshToken: string | undefined,
    userId?: string,
  ): Promise<string | null> {
    if (!refreshToken) {
      return null;
    }

    try {
      const payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(
        refreshToken,
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          ignoreExpiration: true,
        },
      );

      if (!payload.sid) {
        return null;
      }

      if (userId && payload.sub !== userId) {
        return null;
      }

      return payload.sid;
    } catch {
      return null;
    }
  }

  async revokeCurrentSession(
    refreshToken: string | undefined,
    userId: string,
  ): Promise<void> {
    const sessionId = await this.getSessionIdFromRefreshToken(
      refreshToken,
      userId,
    );

    if (sessionId) {
      await this.refreshSessionsRepository.update(sessionId, {
        revokedAt: new Date(),
      });
    }
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.refreshSessionsRepository.revokeAll(userId);
  }
}
