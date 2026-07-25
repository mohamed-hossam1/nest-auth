import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { assertUserNotBanned } from 'src/common/utils/ban.util';
import { compareSha256, hashSha256 } from 'src/common/utils/sha256.util';
import { db } from 'src/db';
import { TokensService, RefreshJwtPayload } from 'src/tokens/tokens.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class RefreshService {
  constructor(
    private readonly usersService: UsersService,
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

    if (user.isBanned) {
      await this.usersService.revokeAllRefreshSessions(user.id);
      this.tokensService.clearRefreshTokenCookie(res);
      const ban = await this.usersService.findBanByUserId(user.id);
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

    this.tokensService.setRefreshTokenToCookie(res, tokens.refreshToken);

    return {
      message: AUTH_MESSAGES.REFRESH_SUCCESS,
      accessToken: tokens.accessToken,
    };
  }
}
