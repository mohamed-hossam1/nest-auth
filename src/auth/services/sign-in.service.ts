import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { HashingService } from 'src/hashing/hashing.service';
import { TokensService } from 'src/tokens/tokens.service';
import { UsersService } from 'src/users/users.service';
import { SignInDto } from '../dtos/sign-in.dto';

@Injectable()
export class SignInService {
  constructor(
    private readonly userService: UsersService,
    private readonly hashingService: HashingService,
    private readonly tokensService: TokensService,
  ) {}

  async signIn(signInDto: SignInDto, res: Response) {
    const user = await this.userService.findByEmail(signInDto.email);

    if (!user)
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    if (!user.isVerified)
      throw new UnauthorizedException(AUTH_MESSAGES.EMAIL_NOT_VERIFIED);

    const password = await this.hashingService.compare(
      signInDto.password,
      user.passwordHash,
    );

    if (!password)
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);

    return this.tokensService.issueAuthSession(
      user,
      res,
      AUTH_MESSAGES.SIGN_IN_SUCCESS,
    );
  }
}
