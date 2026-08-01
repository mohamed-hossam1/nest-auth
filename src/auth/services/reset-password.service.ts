import { BadRequestException, Injectable } from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { db } from 'src/db';
import { HashingService } from 'src/hashing/hashing.service';
import { UsersRepository } from 'src/users/repositories/users.repository';
import { AuthTokensRepository } from 'src/users/repositories/auth-tokens.repository';
import { RefreshSessionsRepository } from 'src/users/repositories/refresh-sessions.repository';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { parseToken } from '../utils/token.util';
import { compareSha256 } from 'src/common/utils/sha256.util';

@Injectable()
export class ResetPasswordService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authTokensRepository: AuthTokensRepository,
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
    private readonly hashingService: HashingService,
  ) {}

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const parsed = parseToken(resetPasswordDto.token);
    if (!parsed) {
      throw new BadRequestException(AUTH_MESSAGES.INVALID_RESET_TOKEN);
    }

    const match = await this.authTokensRepository.findPasswordResetTokenById(
      parsed.id,
    );
    if (!match) {
      throw new BadRequestException(AUTH_MESSAGES.INVALID_RESET_TOKEN);
    }

    const { token, user } = match;

    const isValidSecret = compareSha256(parsed.secret, token.tokenHash);
    if (!isValidSecret) {
      throw new BadRequestException(AUTH_MESSAGES.INVALID_RESET_TOKEN);
    }

    if (new Date(token.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException(AUTH_MESSAGES.RESET_TOKEN_EXPIRED);
    }

    const passwordHash = await this.hashingService.hash(
      resetPasswordDto.password,
    );

    await db.transaction(async (tx) => {
      await this.usersRepository.update(user.id, { passwordHash }, tx);
      await this.authTokensRepository.deletePasswordResetToken(user.id, tx);
      await this.refreshSessionsRepository.revokeAll(user.id, tx);
    });

    return { message: AUTH_MESSAGES.RESET_PASSWORD_SUCCESS };
  }
}
