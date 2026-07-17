import { ConflictException, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { SignUpDto } from './dtos/sign-up.dto';
import { HashingService } from 'src/hashing/hashing.service';
import crypto from 'crypto';
import { EmailService } from 'src/email/email.service';
import { VerificationEmail } from 'src/email/templates/verification.email';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly hashingService: HashingService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}
  async signUp(signUpDto: SignUpDto) {
    const existingUser = await this.userService.findByEmail(signUpDto.email);
    if (existingUser)
      throw new ConflictException('An account with this email already exists');

    const passwordHash = await this.hashingService.hash(signUpDto.password);

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.userService.create({
      name: signUpDto.name,
      email: signUpDto.email,
      passwordHash,
      verifyToken,
      verifyTokenExpiry,
    });

    const verificationEmail = new VerificationEmail(
      user.email,
      user.name,
      `${this.configService.get<string>('APP_URL')}/auth/verify-email?token=${user.verifyToken}`,
    );
    void this.emailService.send(verificationEmail);

    return user;
  }
}
