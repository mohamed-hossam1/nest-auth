import { ConflictException, Injectable } from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { db } from 'src/db';
import { UserWithRole, type EmailVerificationToken } from 'src/db/schema';
import { HashingService } from 'src/hashing/hashing.service';
import { UsersService } from 'src/users/users.service';
import { SignUpDto } from '../dtos/sign-up.dto';
import { ResendVerificationEmailService } from './resend-verification-email.service';

@Injectable()
export class SignUpService {
  constructor(
    private readonly userService: UsersService,
    private readonly hashingService: HashingService,
    private readonly resendVerificationEmailService: ResendVerificationEmailService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const match = await this.userService.findUserWithVerificationToken(
      signUpDto.email,
    );

    if (match) {
      return this.handleExistingSignUp(match.user, match.token);
    }

    const passwordHash = await this.hashingService.hash(signUpDto.password);

    try {
      const { user, rawToken } = await db.transaction(async (tx) => {
        const created = await this.userService.create(
          {
            name: signUpDto.name ?? null,
            email: signUpDto.email,
            passwordHash,
            role: 'user',
          },
          tx,
        );

        const rawToken =
          await this.resendVerificationEmailService.issueVerificationToken(
            created.id,
            tx,
          );

        return { user: created, rawToken };
      });

      this.resendVerificationEmailService.sendVerificationEmail(
        user.email,
        user.name,
        rawToken,
      );

      return { message: AUTH_MESSAGES.SIGN_UP_SUCCESS };
    } catch (error) {
      if (!this.isUniqueViolation(error)) {
        throw error;
      }

      const raced = await this.userService.findUserWithVerificationToken(
        signUpDto.email,
      );
      if (raced) {
        return this.handleExistingSignUp(raced.user, raced.token);
      }

      throw new ConflictException(AUTH_MESSAGES.EMAIL_ALREADY_EXISTS);
    }
  }

  private async handleExistingSignUp(
    user: UserWithRole,
    token: EmailVerificationToken | null,
  ) {
    if (user.isVerified) {
      throw new ConflictException(AUTH_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    return this.resendVerificationEmailService.sendVerificationEmailForUser(
      user,
      token,
    );
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
