import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_CONFIG } from 'src/common/constants/auth.constant';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { db } from 'src/db';
import { EmailService } from 'src/email/email.service';
import { PasswordResetEmail } from 'src/email/templates/password-reset.email';
import { HashingService } from 'src/hashing/hashing.service';
import { UsersService } from 'src/users/users.service';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { formatToken, generateRandomToken } from '../utils/token.util';

@Injectable()
export class ForgotPasswordService {
  constructor(
    private readonly userService: UsersService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly hashingService: HashingService,
  ) {}

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const success = { message: AUTH_MESSAGES.FORGOT_PASSWORD_SUCCESS };

    const user = await this.userService.findByEmail(forgotPasswordDto.email);

    if (!user || !user.isVerified) {
      return success;
    }

    const passwordResetToken =
      await this.userService.findPasswordResetTokenByUserId(user.id);

    if (!this.canResendPasswordReset(passwordResetToken?.expiresAt ?? null)) {
      return success;
    }

    const secret = generateRandomToken();
    const tokenHash = await this.hashingService.hash(secret);
    const expiresAt = new Date(Date.now() + AUTH_CONFIG.RESET_TOKEN_TTL_MS);

    const token = await db.transaction(async (tx) => {
      return this.userService.upsertPasswordResetToken(
        {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
        tx,
      );
    });

    const rawToken = formatToken(token.id, secret);
    this.sendPasswordResetEmail(user.email, user.name, rawToken);

    return success;
  }

  private canResendPasswordReset(expiresAt: Date | string | null): boolean {
    if (!expiresAt) {
      return true;
    }

    const lastSentAt =
      new Date(expiresAt).getTime() - AUTH_CONFIG.RESET_TOKEN_TTL_MS;

    return (
      Date.now() - lastSentAt >= AUTH_CONFIG.PASSWORD_RESET_RESEND_COOLDOWN_MS
    );
  }

  private sendPasswordResetEmail(
    email: string,
    name: string | null,
    resetToken: string,
  ) {
    const passwordResetEmail = new PasswordResetEmail(
      email,
      name,
      `${this.configService.get<string>('APP_URL')}/reset-password?token=${resetToken}`,
    );
    void this.emailService.send(passwordResetEmail).catch(() => undefined);
  }
}
