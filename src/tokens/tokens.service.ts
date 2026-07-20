import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { compareSha256, hashSha256 } from 'src/common/utils/sha256.util';
import { db } from 'src/db';
import { UserWithRole } from 'src/db/schema';
import { UsersService } from 'src/users/users.service';
import { generateRandomToken } from 'src/auth/utils/token.util';

export type JwtPayload = {
  sub: string;
  email: string;
  name: string | null;
  role: string;
};

type RefreshJwtPayload = JwtPayload & {
  sid: string;
};

export type SessionMeta = {
  deviceName?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
};

@Injectable()
export class TokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  private getRefreshTokenTtlMs(): number {
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
    const expiresAt = new Date(Date.now() + this.getRefreshTokenTtlMs());
    const placeholderHash = hashSha256(generateRandomToken());

    const result = await db.transaction(async (tx) => {
      const session = await this.usersService.createRefreshSession(
        {
          userId: user.id,
          tokenHash: placeholderHash,
          deviceName: meta.deviceName ?? null,
          userAgent: meta.userAgent ?? null,
          ipAddress: meta.ipAddress ?? null,
          expiresAt,
        },
        tx,
      );

      const refreshToken = await this.generateRefreshToken(user, session.id);
      const accessToken = await this.generateAccessToken(user);
      const refreshTokenHash = hashSha256(refreshToken);

      await this.usersService.updateRefreshSession(
        session.id,
        {
          tokenHash: refreshTokenHash,
          expiresAt,
        },
        tx,
      );

      return { accessToken, refreshToken };
    });

    this.setRefreshTokenToCookie(res, result.refreshToken);

    return {
      message,
      accessToken: result.accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string | undefined, res: Response) {
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

    if (!payload.sid) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    const session = await this.usersService.findRefreshSessionById(payload.sid);
    if (
      !session ||
      session.revokedAt ||
      new Date(session.expiresAt).getTime() < Date.now()
    ) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    const isValid = compareSha256(refreshToken, session.tokenHash);
    if (!isValid) {
      await this.usersService.revokeRefreshSession(session.id);
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    const user = await this.usersService.findById(session.userId);
    if (!user?.isVerified) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    const expiresAt = new Date(Date.now() + this.getRefreshTokenTtlMs());

    const tokens = await db.transaction(async (tx) => {
      const newRefreshToken = await this.generateRefreshToken(user, session.id);
      const accessToken = await this.generateAccessToken(user);
      const tokenHash = hashSha256(newRefreshToken);

      await this.usersService.updateRefreshSession(
        session.id,
        {
          tokenHash,
          expiresAt,
          revokedAt: null,
        },
        tx,
      );

      return { accessToken, refreshToken: newRefreshToken };
    });

    this.setRefreshTokenToCookie(res, tokens.refreshToken);

    return {
      message: AUTH_MESSAGES.REFRESH_SUCCESS,
      accessToken: tokens.accessToken,
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
      await this.usersService.revokeRefreshSession(sessionId);
    }
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.usersService.revokeAllRefreshSessions(userId);
  }
}
