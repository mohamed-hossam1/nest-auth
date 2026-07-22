import { BadRequestException, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { assertUserNotBanned } from 'src/common/utils/ban.util';
import { db } from 'src/db';
import { HashingService } from 'src/hashing/hashing.service';
import { TokensService } from 'src/tokens/tokens.service';
import { UsersService } from 'src/users/users.service';
import { parseToken } from '../utils/token.util';

@Injectable()
export class VerifyEmailService {
  constructor(
    private readonly userService: UsersService,
    private readonly tokensService: TokensService,
    private readonly hashingService: HashingService,
  ) {}

  async verifyEmail(token: string, res: Response) {
    if (!token) {
      throw new BadRequestException(AUTH_MESSAGES.INVALID_VERIFY_TOKEN);
    }

    const parsed = parseToken(token);
    if (!parsed) {
      throw new BadRequestException(AUTH_MESSAGES.INVALID_VERIFY_TOKEN);
    }

    const match = await this.userService.findEmailVerificationTokenById(
      parsed.id,
    );
    if (!match) {
      throw new BadRequestException(AUTH_MESSAGES.INVALID_VERIFY_TOKEN);
    }

    const { token: verificationToken, user } = match;

    const isValidSecret = await this.hashingService.compare(
      parsed.secret,
      verificationToken.tokenHash,
    );
    if (!isValidSecret) {
      throw new BadRequestException(AUTH_MESSAGES.INVALID_VERIFY_TOKEN);
    }

    if (user.isVerified) {
      await this.userService.deleteEmailVerificationToken(user.id);
      return { message: AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED };
    }

    assertUserNotBanned(user);

    if (new Date(verificationToken.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException(AUTH_MESSAGES.VERIFY_TOKEN_EXPIRED);
    }

    const verifiedUser = await db.transaction(async (tx) => {
      const updated = await this.userService.update(
        user.id,
        { isVerified: true },
        tx,
      );

      await this.userService.deleteEmailVerificationToken(user.id, tx);

      return updated;
    });

    if (!verifiedUser) {
      throw new BadRequestException(AUTH_MESSAGES.INVALID_VERIFY_TOKEN);
    }

    return this.tokensService.issueAuthSession(
      verifiedUser,
      res,
      AUTH_MESSAGES.EMAIL_VERIFIED_SUCCESS,
    );
  }
}
