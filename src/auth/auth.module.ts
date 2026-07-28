import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from '../common/guards/auth.guard';
import { HashingModule } from 'src/hashing/hashing.module';
import { TokensModule } from 'src/tokens/tokens.module';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/email/email.module';
import { ConfigModule } from '@nestjs/config';
import { SignUpService } from './services/sign-up.service';
import { SignInService } from './services/sign-in.service';
import { VerifyEmailService } from './services/verify-email.service';
import { LogoutService } from './services/logout.service';
import { ListSessionsService } from './services/list-sessions.service';
import { RevokeSessionService } from './services/revoke-session.service';
import { RevokeAllOtherSessionsService } from './services/revoke-all-other-sessions.service';
import { ForgotPasswordService } from './services/forgot-password.service';
import { ResetPasswordService } from './services/reset-password.service';
import { ChangePasswordService } from './services/change-password.service';
import { RefreshService } from './services/refresh.service';
import { ResendVerificationEmailService } from './services/resend-verification-email.service';

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
    ListSessionsService,
    RevokeSessionService,
    RevokeAllOtherSessionsService,
    ForgotPasswordService,
    ResetPasswordService,
    ChangePasswordService,
    RefreshService,
    ResendVerificationEmailService,
    AuthGuard,
  ],
})
export class AuthModule {}
