import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_CONFIG } from 'src/common/constants/auth.constant';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { type DbTransaction } from 'src/db';
import { UserWithRole, type EmailVerificationToken } from 'src/db/schema';
import { EmailService } from 'src/email/email.service';
import { VerificationEmail } from 'src/email/templates/verification.email';
import { AuthTokensRepository } from 'src/users/repositories/auth-tokens.repository';
import { formatToken, generateRandomToken } from '../utils/token.util';
import { hashSha256 } from 'src/common/utils/sha256.util';

@Injectable()
export class ResendVerificationEmailService {
  constructor(
    private readonly authTokensRepository: AuthTokensRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async resendVerificationEmail(email: string) {
    const match =
      await this.authTokensRepository.findUserWithVerificationToken(email);

    if (!match || match.user.isVerified) {
      return { message: AUTH_MESSAGES.VERIFICATION_EMAIL_SENT };
    }

    return this.sendVerificationEmailForUser(match.user, match.token);
  }

  async sendVerificationEmailForUser(
    user: UserWithRole,
    token: EmailVerificationToken | null = null,
  ) {
    const verificationToken =
      token ??
      (await this.authTokensRepository.findEmailVerificationTokenByUserId(
        user.id,
      ));

    if (!this.canResendVerification(verificationToken?.expiresAt ?? null)) {
      throw new HttpException(
        AUTH_MESSAGES.VERIFICATION_RESEND_COOLDOWN,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const rawToken = await this.issueVerificationToken(user.id);

    this.sendVerificationEmail(user.email, user.name, rawToken);

    return { message: AUTH_MESSAGES.VERIFICATION_EMAIL_SENT };
  }

  async issueVerificationToken(
    userId: string,
    tx?: DbTransaction,
  ): Promise<string> {
    const secret = generateRandomToken();
    const tokenHash = hashSha256(secret);
    const expiresAt = new Date(Date.now() + AUTH_CONFIG.VERIFY_TOKEN_TTL_MS);

    const token = await this.authTokensRepository.upsertEmailVerificationToken(
      {
        userId,
        tokenHash,
        expiresAt,
      },
      tx,
    );

    return formatToken(token.id, secret);
  }

  sendVerificationEmail(
    email: string,
    name: string | null,
    verifyToken: string,
  ) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const verificationEmail = new VerificationEmail(
      email,
      name,
      `${frontendUrl}/verify?token=${encodeURIComponent(verifyToken)}`,
    );
    void this.emailService.send(verificationEmail).catch(() => undefined);
  }

  private canResendVerification(expiresAt: Date | string | null): boolean {
    if (!expiresAt) {
      return true;
    }

    const lastSentAt =
      new Date(expiresAt).getTime() - AUTH_CONFIG.VERIFY_TOKEN_TTL_MS;

    return (
      Date.now() - lastSentAt >= AUTH_CONFIG.VERIFICATION_RESEND_COOLDOWN_MS
    );
  }
}
