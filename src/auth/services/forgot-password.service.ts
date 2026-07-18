import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { AUTH_CONFIG } from 'src/common/constants/auth.constant';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { User } from 'src/db/schema';
import { EmailService } from 'src/email/email.service';
import { PasswordResetEmail } from 'src/email/templates/password-reset.email';
import { UsersService } from 'src/users/users.service';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';

@Injectable()
export class ForgotPasswordService {
  constructor(
    private readonly userService: UsersService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userService.findByEmail(forgotPasswordDto.email);

    if (!user || !user.isVerified) {
      return { message: AUTH_MESSAGES.FORGOT_PASSWORD_SUCCESS };
    }

    if (!this.canResendPasswordReset(user)) {
      throw new HttpException(
        AUTH_MESSAGES.PASSWORD_RESET_RESEND_COOLDOWN,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const { resetToken, resetTokenExpiry } = this.createResetToken();
    await this.userService.update(user.id, {
      resetToken,
      resetTokenExpiry,
    });

    this.sendPasswordResetEmail(user.email, user.name, resetToken);

    return { message: AUTH_MESSAGES.FORGOT_PASSWORD_SUCCESS };
  }

  private createResetToken() {
    return {
      resetToken: crypto.randomBytes(32).toString('hex'),
      resetTokenExpiry: new Date(Date.now() + AUTH_CONFIG.RESET_TOKEN_TTL_MS),
    };
  }

  private canResendPasswordReset(user: User): boolean {
    if (!user.resetTokenExpiry) {
      return true;
    }

    const lastSentAt =
      new Date(user.resetTokenExpiry).getTime() -
      AUTH_CONFIG.RESET_TOKEN_TTL_MS;
    return (
      Date.now() - lastSentAt >= AUTH_CONFIG.PASSWORD_RESET_RESEND_COOLDOWN_MS
    );
  }

  private sendPasswordResetEmail(
    email: string,
    name: string,
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
