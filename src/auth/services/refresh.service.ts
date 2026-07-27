import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { assertUserNotBanned } from 'src/common/utils/ban.util';
import { compareSha256, hashSha256 } from 'src/common/utils/sha256.util';
import { db } from 'src/db';
import { TokensService, RefreshJwtPayload } from 'src/tokens/tokens.service';
import { UsersRepository } from 'src/users/repositories/users.repository';
import { RefreshSessionsRepository } from 'src/users/repositories/refresh-sessions.repository';

@Injectable()
export class RefreshService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
    private readonly tokensService: TokensService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async refresh(refreshToken: string | undefined, res: Response) {
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

    const result = await this.refreshSessionsRepository.findSessionWithUser(
      payload.sid,
    );
    if (
      !result ||
      result.session.revokedAt ||
      new Date(result.session.expiresAt).getTime() < Date.now()
    ) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    const { session, user } = result;

    const isValid = compareSha256(refreshToken, session.tokenHash);
    if (!isValid) {
      await this.refreshSessionsRepository.update(session.id, {
        revokedAt: new Date(),
      });
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    if (user.isBanned) {
      await this.refreshSessionsRepository.revokeAll(user.id);
      this.tokensService.clearRefreshTokenCookie(res);
      const ban = await this.usersRepository.findBanByUserId(user.id);
      assertUserNotBanned({
        isBanned: true,
        banReason: ban?.banReason,
      });
    }

    const expiresAt = new Date(
      Date.now() + this.tokensService.getRefreshTokenTtlMs(),
    );

    const tokens = await db.transaction(async (tx) => {
      const newRefreshToken = await this.tokensService.generateRefreshToken(
        user,
        session.id,
      );
      const accessToken = await this.tokensService.generateAccessToken(user);
      const tokenHash = hashSha256(newRefreshToken);

      await this.refreshSessionsRepository.update(
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

    this.tokensService.setRefreshTokenToCookie(res, tokens.refreshToken);

    return {
      message: AUTH_MESSAGES.REFRESH_SUCCESS,
      accessToken: tokens.accessToken,
    };
  }
}
