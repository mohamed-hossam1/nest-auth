import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { AUTH_CONFIG } from 'src/common/constants/auth.constant';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { User } from 'src/db/schema';
import { EmailService } from 'src/email/email.service';
import { VerificationEmail } from 'src/email/templates/verification.email';
import { HashingService } from 'src/hashing/hashing.service';
import { UsersService } from 'src/users/users.service';
import { SignUpDto } from '../dtos/sign-up.dto';

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
    const { verifyToken, verifyTokenExpiry } = this.createVerifyToken();

    try {
      const user = await this.userService.create({
        name: signUpDto.name,
        email: signUpDto.email,
        passwordHash,
        verifyToken,
        verifyTokenExpiry,
      });

      this.sendVerificationEmail(user.email, user.name, user.verifyToken);

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

  private async handleExistingSignUp(user: User) {
    if (user.isVerified) {
      throw new ConflictException(AUTH_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    if (!this.canResendVerification(user)) {
      throw new HttpException(
        AUTH_MESSAGES.VERIFICATION_RESEND_COOLDOWN,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const { verifyToken, verifyTokenExpiry } = this.createVerifyToken();
    await this.userService.update(user.id, {
      verifyToken,
      verifyTokenExpiry,
    });

    this.sendVerificationEmail(user.email, user.name, verifyToken);

    return { message: AUTH_MESSAGES.SIGN_UP_SUCCESS };
  }

  private canResendVerification(user: User): boolean {
    const lastSentAt =
      new Date(user.verifyTokenExpiry).getTime() -
      AUTH_CONFIG.VERIFY_TOKEN_TTL_MS;
    return (
      Date.now() - lastSentAt >= AUTH_CONFIG.VERIFICATION_RESEND_COOLDOWN_MS
    );
  }

  private createVerifyToken() {
    return {
      verifyToken: crypto.randomBytes(32).toString('hex'),
      verifyTokenExpiry: new Date(Date.now() + AUTH_CONFIG.VERIFY_TOKEN_TTL_MS),
    };
  }

  private sendVerificationEmail(
    email: string,
    name: string,
    verifyToken: string,
  ) {
    const verificationEmail = new VerificationEmail(
      email,
      name,
      `${this.configService.get<string>('APP_URL')}/api/auth/verify-email?token=${verifyToken}`,
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
