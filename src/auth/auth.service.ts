import { TokensService } from './../tokens/tokens.service';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { SignUpDto } from './dtos/sign-up.dto';
import { HashingService } from 'src/hashing/hashing.service';
import crypto from 'crypto';
import { EmailService } from 'src/email/email.service';
import { VerificationEmail } from 'src/email/templates/verification.email';
import { ConfigService } from '@nestjs/config';
import { SignInDto } from './dtos/sign-in.dto';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly hashingService: HashingService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly tokensService: TokensService,
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
  async signIn(signInDto: SignInDto, res: Response) {
    const user = await this.userService.findByEmail(signInDto.email);

    if (!user) throw new UnauthorizedException('Invalid email or password');
    if (!user.isVerified)
      throw new UnauthorizedException('Please verify your email');

    const password = await this.hashingService.compare(
      signInDto.password,
      user.passwordHash,
    );

    if (!password) throw new UnauthorizedException('Invalid email or password');

    const tokens = await this.tokensService.generateTokens(user);
    await this.tokensService.saveRefreshToken(user.id, tokens.refreshToken);
    this.tokensService.setRefreshTokenToCookie(res, tokens.refreshToken);

    return {
      message: 'Login successful',
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
