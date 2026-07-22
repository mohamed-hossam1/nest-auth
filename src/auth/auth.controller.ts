import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TokensService } from 'src/tokens/tokens.service';
import { SignUpDto } from './dtos/sign-up.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { VerifyEmailDto } from './dtos/verify-email.dto';
import { ResendVerificationEmailDto } from './dtos/resend-verification-email.dto';
import { RevokeSessionDto } from './dtos/revoke-session.dto';
import { SessionsListResponseDto } from './dtos/session-response.dto';
import type { Request, Response } from 'express';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { User } from 'src/common/decorators/user.decorator';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { SignUpService } from './services/sign-up.service';
import { SignInService } from './services/sign-in.service';
import { VerifyEmailService } from './services/verify-email.service';
import { LogoutService } from './services/logout.service';
import { SessionsService } from './services/sessions.service';
import { ForgotPasswordService } from './services/forgot-password.service';
import { ResetPasswordService } from './services/reset-password.service';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { ChangePasswordService } from './services/change-password.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly signUpService: SignUpService,
    private readonly signInService: SignInService,
    private readonly verifyEmailService: VerifyEmailService,
    private readonly logoutService: LogoutService,
    private readonly sessionsService: SessionsService,
    private readonly forgotPasswordService: ForgotPasswordService,
    private readonly resetPasswordService: ResetPasswordService,
    private readonly tokensService: TokensService,
    private readonly changePasswordService: ChangePasswordService,
  ) {}

  @Post('sign-up')
  @ApiOperation({ summary: 'Register a new account' })
  signUp(@Body() signUpDto: SignUpDto) {
    return this.signUpService.signUp(signUpDto);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  signIn(
    @Body() signInDto: SignInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.signInService.signIn(signInDto, res, req);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address and auto sign in',
    description:
      'Accepts the verification token from the email link. Must be POST so link scanners cannot consume the one-time token.',
  })
  verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.verifyEmailService.verifyEmail(verifyEmailDto.token, res);
  }

  @Post('resend-verification-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend a verification email',
    description:
      'Sends a new verification email for an existing unverified account. Does not create a new account.',
  })
  resendVerificationEmail(
    @Body() resendVerificationEmailDto: ResendVerificationEmailDto,
  ) {
    return this.signUpService.resendVerificationEmail(
      resendVerificationEmailDto.email,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh cookie' })
  @ApiCookieAuth('refresh_token')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.tokensService.refreshToken(req.cookies?.refresh_token, res);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user' })
  me(@User() user: AuthUser) {
    return { user };
  }

  @Get('sessions')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('refresh_token')
  @ApiOperation({
    summary: 'List active refresh sessions',
    description:
      'Returns all active (non-revoked, non-expired) refresh sessions for the authenticated user.',
  })
  @ApiOkResponse({ type: SessionsListResponseDto })
  listSessions(@User() user: AuthUser, @Req() req: Request) {
    return this.sessionsService.listSessions(
      user.id,
      req.cookies?.refresh_token,
    );
  }

  @Post('sessions/revoke')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('refresh_token')
  @ApiOperation({
    summary: 'Revoke a specific refresh session',
    description:
      'Revokes a single refresh session owned by the authenticated user. Clears the refresh cookie when the current session is revoked.',
  })
  revokeSession(
    @User() user: AuthUser,
    @Body() revokeSessionDto: RevokeSessionDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.sessionsService.revokeSession(
      user.id,
      revokeSessionDto.sessionId,
      res,
      req.cookies?.refresh_token,
    );
  }

  @Post('sessions/revoke-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('refresh_token')
  @ApiOperation({
    summary:
      'Revoke all other active refresh sessions for the authenticated user.',
    description:
      'Revokes every active refresh session for the authenticated user except the current session associated with the request. The current session remains active and no new refresh token is issued.',
  })
  revokeAllOtherSessions(@User() user: AuthUser, @Req() req: Request) {
    return this.sessionsService.revokeAllOtherSessions(
      user.id,
      req.cookies?.refresh_token,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Logout and revoke the current refresh session' })
  logout(
    @User() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.logoutService.logout(user.id, res, req.cookies?.refresh_token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.forgotPasswordService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a reset token' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.resetPasswordService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the authenticated user password' })
  changePassword(
    @User() user: AuthUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.changePasswordService.changePassword(user, changePasswordDto);
  }
}
