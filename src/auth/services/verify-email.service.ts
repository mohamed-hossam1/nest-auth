import { BadRequestException, Injectable } from '@nestjs/common';
import crypto from 'crypto';
import { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { TokensService } from 'src/tokens/tokens.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class VerifyEmailService {
  constructor(
    private readonly userService: UsersService,
    private readonly tokensService: TokensService,
  ) {}

  async verifyEmail(token: string, res: Response) {
    if (!token) {
      throw new BadRequestException(AUTH_MESSAGES.INVALID_VERIFY_TOKEN);
    }

    const user = await this.userService.findByVerifyToken(token);
    if (!user) {
      throw new BadRequestException(AUTH_MESSAGES.INVALID_VERIFY_TOKEN);
    }

    if (user.isVerified) {
      return { message: AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED };
    }

    if (new Date(user.verifyTokenExpiry).getTime() < Date.now()) {
      throw new BadRequestException(AUTH_MESSAGES.VERIFY_TOKEN_EXPIRED);
    }

    const verifiedUser = await this.userService.update(user.id, {
      isVerified: true,
      verifyToken: crypto.randomBytes(32).toString('hex'),
      verifyTokenExpiry: new Date(0),
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
