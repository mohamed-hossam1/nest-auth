import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as client from 'openid-client';
import { UsersRepository } from 'src/users/repositories/users.repository';
import { OauthAccountsRepository } from 'src/users/repositories/oauth-accounts.repository';
import { TokensService } from 'src/tokens/tokens.service';
import { db } from 'src/db';
import type { Request, Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';

@Injectable()
export class GoogleOauthCallbackService {
  private oauthConfig: client.Configuration | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersRepository: UsersRepository,
    private readonly oauthAccountsRepository: OauthAccountsRepository,
    private readonly tokensService: TokensService,
  ) {}

  private async getOAuthConfig(): Promise<client.Configuration> {
    if (this.oauthConfig) {
      return this.oauthConfig;
    }

    const issuerUrl = new URL('https://accounts.google.com');
    const clientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow<string>(
      'GOOGLE_CLIENT_SECRET',
    );

    this.oauthConfig = await client.discovery(
      issuerUrl,
      clientId,
      clientSecret,
    );

    return this.oauthConfig;
  }

  private async getGoogleUserClaims(
    currentUrl: URL,
    expectedState: string,
    pkceCodeVerifier: string,
  ) {
    const config = await this.getOAuthConfig();

    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      expectedState,
      pkceCodeVerifier,
      idTokenExpected: true,
    });

    const claims = tokens.claims();
    if (!claims) {
      throw new Error(AUTH_MESSAGES.OAUTH_VALIDATION_FAILED);
    }

    if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
      throw new Error(AUTH_MESSAGES.OAUTH_VALIDATION_FAILED);
    }

    if (typeof claims.email !== 'string' || claims.email.length === 0) {
      throw new Error(AUTH_MESSAGES.OAUTH_VALIDATION_FAILED);
    }

    if (claims.email_verified !== true) {
      throw new Error(AUTH_MESSAGES.OAUTH_VALIDATION_FAILED);
    }

    return {
      sub: claims.sub,
      email: claims.email,
      name: claims.name as string | undefined,
      picture: claims.picture as string | undefined,
    };
  }

  async handleCallback(
    currentUrl: URL,
    expectedState: string,
    pkceCodeVerifier: string,
    res: Response,
    req: Request,
  ) {
    let claims;
    try {
      claims = await this.getGoogleUserClaims(
        currentUrl,
        expectedState,
        pkceCodeVerifier,
      );
    } catch {
      throw new UnauthorizedException(AUTH_MESSAGES.OAUTH_VALIDATION_FAILED);
    }

    const { sub, email, name, picture } = claims;

    const sessionResult = await db.transaction(async (tx) => {
      const match = await this.oauthAccountsRepository.findUserByProvider(
        'google',
        sub,
        tx,
      );

      let user;

      if (match) {
        user = match.user;
        const updates: Partial<typeof user> = {};
        if (!user.name && name) updates.name = name;
        if (!user.avatarUrl && picture) updates.avatarUrl = picture;
        if (Object.keys(updates).length > 0) {
          const updated = await this.usersRepository.update(
            user.id,
            updates,
            tx,
          );
          if (updated) {
            user = updated;
          }
        }
      } else {
        user = await this.usersRepository.findByEmail(email, tx);

        if (user) {
          await this.oauthAccountsRepository.create(
            {
              userId: user.id,
              provider: 'google',
              providerUserId: sub,
            },
            tx,
          );

          const updates: Partial<typeof user> = {};
          if (!user.isVerified) updates.isVerified = true;
          if (!user.avatarUrl && picture) updates.avatarUrl = picture;
          if (!user.name && name) updates.name = name;
          if (Object.keys(updates).length > 0) {
            const updated = await this.usersRepository.update(
              user.id,
              updates,
              tx,
            );
            if (updated) {
              user = updated;
            }
          }
        } else {
          user = await this.usersRepository.create(
            {
              email,
              name: name ?? null,
              avatarUrl: picture ?? null,
              role: 'user',
              isVerified: true,
            },
            tx,
          );

          await this.oauthAccountsRepository.create(
            {
              userId: user.id,
              provider: 'google',
              providerUserId: sub,
            },
            tx,
          );
        }
      }

      return user;
    });

    return this.tokensService.issueAuthSession(
      sessionResult,
      res,
      AUTH_MESSAGES.OAUTH_LOGIN_SUCCESS,
      {
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
      },
    );
  }
}
