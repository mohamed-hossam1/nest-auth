import { BadRequestException, Injectable } from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { db } from 'src/db';
import { HashingService } from 'src/hashing/hashing.service';
import { UsersService } from 'src/users/users.service';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { parseToken } from '../utils/token.util';

@Injectable()
export class ResetPasswordService {
  constructor(
    private readonly userService: UsersService,
    private readonly hashingService: HashingService,
  ) {}

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const parsed = parseToken(resetPasswordDto.token);
    if (!parsed) {
      throw new BadRequestException(AUTH_MESSAGES.INVALID_RESET_TOKEN);
    }

    const match = await this.userService.findPasswordResetTokenById(parsed.id);
    if (!match) {
      throw new BadRequestException(AUTH_MESSAGES.INVALID_RESET_TOKEN);
    }

    const { token, user } = match;

    const isValidSecret = await this.hashingService.compare(
      parsed.secret,
      token.tokenHash,
    );
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
      await this.userService.update(user.id, { passwordHash }, tx);
      await this.userService.deletePasswordResetToken(user.id, tx);
      await this.userService.revokeAllRefreshSessions(user.id, tx);
    });

    return { message: AUTH_MESSAGES.RESET_PASSWORD_SUCCESS };
  }
}
