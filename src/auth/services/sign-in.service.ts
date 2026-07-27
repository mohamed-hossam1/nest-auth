import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AUTH_CONFIG } from 'src/common/constants/auth.constant';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { HashingService } from 'src/hashing/hashing.service';
import { TokensService } from 'src/tokens/tokens.service';
import { UsersRepository } from 'src/users/repositories/users.repository';
import { SignInDto } from '../dtos/sign-in.dto';

@Injectable()
export class SignInService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly hashingService: HashingService,
    private readonly tokensService: TokensService,
  ) {}

  async signIn(signInDto: SignInDto, res: Response, req?: Request) {
    const user = await this.usersRepository.findByEmail(signInDto.email);

    const passwordValid = await this.hashingService.compare(
      signInDto.password,
      user?.passwordHash ?? AUTH_CONFIG.DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordValid) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(AUTH_MESSAGES.EMAIL_NOT_VERIFIED);
    }

    return this.tokensService.issueAuthSession(
      user,
      res,
      AUTH_MESSAGES.SIGN_IN_SUCCESS,
      {
        userAgent: req?.headers['user-agent'] ?? null,
        ipAddress: req?.ip ?? null,
      },
    );
  }
}
