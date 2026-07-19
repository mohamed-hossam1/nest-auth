import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_CONFIG } from 'src/common/constants/auth.constant';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { db, type DbTransaction } from 'src/db';
import { UserWithRole } from 'src/db/schema';
import { EmailService } from 'src/email/email.service';
import { VerificationEmail } from 'src/email/templates/verification.email';
import { HashingService } from 'src/hashing/hashing.service';
import { UsersService } from 'src/users/users.service';
import { SignUpDto } from '../dtos/sign-up.dto';
import { formatToken, generateRandomToken } from '../utils/token.util';

@Injectable()
export class SignUpService {
  constructor(
    private readonly userService: UsersService,
    private readonly hashingService: HashingService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const existingUser = await this.userService.findByEmail(signUpDto.email);

    if (existingUser) {
      return this.handleExistingSignUp(existingUser);
    }

    const passwordHash = await this.hashingService.hash(signUpDto.password);

    try {
      const { user, rawToken } = await db.transaction(async (tx) => {
        const roleId = await this.userService.findRoleIdByName('user', tx);
        if (!roleId) {
          throw new Error('Default role "user" is not seeded');
        }

        const created = await this.userService.create(
          {
            name: signUpDto.name ?? null,
            email: signUpDto.email,
            passwordHash,
            roleId,
          },
          tx,
        );

        const rawToken = await this.issueVerificationToken(created.id, tx);

        return { user: created, rawToken };
      });

      this.sendVerificationEmail(user.email, user.name, rawToken);

      return { message: AUTH_MESSAGES.SIGN_UP_SUCCESS };
    } catch (error) {
      if (!this.isUniqueViolation(error)) {
        throw error;
      }

      const racedUser = await this.userService.findByEmail(signUpDto.email);
      if (racedUser) {
        return this.handleExistingSignUp(racedUser);
      }

      throw new ConflictException(AUTH_MESSAGES.EMAIL_ALREADY_EXISTS);
    }
  }

  private async handleExistingSignUp(user: UserWithRole) {
    if (user.isVerified) {
      throw new ConflictException(AUTH_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    const verificationToken =
      await this.userService.findEmailVerificationTokenByUserId(user.id);

    if (!this.canResendVerification(verificationToken?.expiresAt ?? null)) {
      throw new HttpException(
        AUTH_MESSAGES.VERIFICATION_RESEND_COOLDOWN,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const rawToken = await db.transaction(async (tx) => {
      return this.issueVerificationToken(user.id, tx);
    });

    this.sendVerificationEmail(user.email, user.name, rawToken);

    return { message: AUTH_MESSAGES.SIGN_UP_SUCCESS };
  }

  private async issueVerificationToken(
    userId: string,
    tx: DbTransaction,
  ): Promise<string> {
    const secret = generateRandomToken();
    const tokenHash = await this.hashingService.hash(secret);
    const expiresAt = new Date(Date.now() + AUTH_CONFIG.VERIFY_TOKEN_TTL_MS);

    const token = await this.userService.upsertEmailVerificationToken(
      {
        userId,
        tokenHash,
        expiresAt,
      },
      tx,
    );

    return formatToken(token.id, secret);
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

  private sendVerificationEmail(
    email: string,
    name: string | null,
    verifyToken: string,
  ) {
    const verificationEmail = new VerificationEmail(
      email,
      name,
      // Frontend page reads the token and POSTs it to /api/auth/verify-email
      // (GET must not perform verification — email scanners prefetch links).
      `${this.configService.get<string>('APP_URL')}/verify-email?token=${encodeURIComponent(verifyToken)}`,
    );
    void this.emailService.send(verificationEmail).catch(() => undefined);
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}
