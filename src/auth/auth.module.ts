import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { HashingModule } from 'src/hashing/hashing.module';
import { TokensModule } from 'src/tokens/tokens.module';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/email/email.module';
import { ConfigModule } from '@nestjs/config';
import { SignUpService } from './services/sign-up.service';
import { SignInService } from './services/sign-in.service';
import { VerifyEmailService } from './services/verify-email.service';
import { LogoutService } from './services/logout.service';
import { SessionsService } from './services/sessions.service';
import { ForgotPasswordService } from './services/forgot-password.service';
import { ResetPasswordService } from './services/reset-password.service';

@Module({
  imports: [
    HashingModule,
    TokensModule,
    UsersModule,
    EmailModule,
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    SignUpService,
    SignInService,
    VerifyEmailService,
    LogoutService,
    SessionsService,
    ForgotPasswordService,
    ResetPasswordService,
    AccessTokenGuard,
  ],
})
export class AuthModule {}
