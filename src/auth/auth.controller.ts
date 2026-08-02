import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
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

import { SignUpDto } from './dtos/sign-up.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { VerifyEmailDto } from './dtos/verify-email.dto';
import { ResendVerificationEmailDto } from './dtos/resend-verification-email.dto';
import { RevokeSessionDto } from './dtos/revoke-session.dto';
import { SessionsListResponseDto } from './dtos/session-response.dto';
import type { Request, Response } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { User } from 'src/common/decorators/user.decorator';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { SignUpService } from './services/sign-up.service';
import { SignInService } from './services/sign-in.service';
import { VerifyEmailService } from './services/verify-email.service';
import { LogoutService } from './services/logout.service';
import { ListSessionsService } from './services/list-sessions.service';
import { RevokeSessionService } from './services/revoke-session.service';
import { RevokeAllOtherSessionsService } from './services/revoke-all-other-sessions.service';
import { ForgotPasswordService } from './services/forgot-password.service';
import { ResetPasswordService } from './services/reset-password.service';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { ChangePasswordService } from './services/change-password.service';
import { RefreshService } from './services/refresh.service';
import { ResendVerificationEmailService } from './services/resend-verification-email.service';
import { GoogleOauthLoginService } from './services/google-oauth-login.service';
import { GoogleOauthCallbackService } from './services/google-oauth-callback.service';
import { ConfigService } from '@nestjs/config';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { SetPasswordDto } from './dtos/set-password.dto';
import { SetPasswordService } from './services/set-password.service';
import { ListOauthAccountsService } from './services/list-oauth-accounts.service';
import { UnlinkOauthAccountService } from './services/unlink-oauth-account.service';
import { UnlinkOauthAccountDto } from './dtos/unlink-oauth-account.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly signUpService: SignUpService,
    private readonly signInService: SignInService,
    private readonly verifyEmailService: VerifyEmailService,
    private readonly logoutService: LogoutService,
    private readonly listSessionsService: ListSessionsService,
    private readonly revokeSessionService: RevokeSessionService,
    private readonly revokeAllOtherSessionsService: RevokeAllOtherSessionsService,
    private readonly forgotPasswordService: ForgotPasswordService,
    private readonly resetPasswordService: ResetPasswordService,
    private readonly refreshService: RefreshService,
    private readonly changePasswordService: ChangePasswordService,
    private readonly resendVerificationEmailService: ResendVerificationEmailService,
    private readonly googleOauthLoginService: GoogleOauthLoginService,
    private readonly googleOauthCallbackService: GoogleOauthCallbackService,
    private readonly configService: ConfigService,
    private readonly setPasswordService: SetPasswordService,
    private readonly listOauthAccountsService: ListOauthAccountsService,
    private readonly unlinkOauthAccountService: UnlinkOauthAccountService,
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

  @Get('verify-email')
  @ApiOperation({ summary: 'Redirect verification token link to frontend UI' })
  verifyEmailRedirect(@Query('token') token: string, @Res() res: Response) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    if (token) {
      return res.redirect(
        `${frontendUrl}/verify?token=${encodeURIComponent(token)}`,
      );
    }
    return res.redirect(`${frontendUrl}/verify`);
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
    return this.resendVerificationEmailService.resendVerificationEmail(
      resendVerificationEmailDto.email,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh cookie' })
  @ApiCookieAuth('refresh_token')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.refreshService.refresh(req.cookies?.refresh_token, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
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

  @Get('sessions')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('refresh_token')
  @ApiOperation({
    summary: 'List active refresh sessions',
    description:
      'Returns all active (non-revoked, non-expired) refresh sessions for the authenticated user.',
  })
  @ApiOkResponse({ type: SessionsListResponseDto })
  listSessions(@User() user: AuthUser, @Req() req: Request) {
    return this.listSessionsService.listSessions(
      user.id,
      req.cookies?.refresh_token,
    );
  }

  @Post('sessions/revoke')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
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
    return this.revokeSessionService.revokeSession(
      user.id,
      revokeSessionDto.sessionId,
      res,
      req.cookies?.refresh_token,
    );
  }

  @Post('sessions/revoke-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('refresh_token')
  @ApiOperation({
    summary:
      'Revoke all other active refresh sessions for the authenticated user.',
    description:
      'Revokes every active refresh session for the authenticated user except the current session associated with the request. The current session remains active and no new refresh token is issued.',
  })
  revokeAllOtherSessions(@User() user: AuthUser, @Req() req: Request) {
    return this.revokeAllOtherSessionsService.revokeAllOtherSessions(
      user.id,
      req.cookies?.refresh_token,
    );
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
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the authenticated user password' })
  changePassword(
    @User() user: AuthUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.changePasswordService.changePassword(user, changePasswordDto);
  }

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set password for an account without one' })
  setPassword(@User() user: AuthUser, @Body() setPasswordDto: SetPasswordDto) {
    return this.setPasswordService.setPassword(user, setPasswordDto);
  }

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth login flow' })
  async googleLogin(@Res() res: Response) {
    const { url, state, codeVerifier } =
      await this.googleOauthLoginService.generateAuthParams();

    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });

    res.cookie('oauth_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });

    res.redirect(url);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback handler' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const state = req.query.state as string | undefined;
    const code = req.query.code as string | undefined;

    const cookieState = req.cookies?.oauth_state as string | undefined;
    const cookieCodeVerifier = req.cookies?.oauth_code_verifier as
      string | undefined;

    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const clearCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
    };
    res.clearCookie('oauth_state', clearCookieOptions);
    res.clearCookie('oauth_code_verifier', clearCookieOptions);

    if (
      !state ||
      !cookieState ||
      state !== cookieState ||
      !cookieCodeVerifier ||
      !code
    ) {
      throw new BadRequestException(AUTH_MESSAGES.OAUTH_VALIDATION_FAILED);
    }

    const appUrl =
      this.configService.get<string>('APP_URL') ?? 'http://localhost:5000';
    const currentUrl = new URL(req.url, appUrl);

    await this.googleOauthCallbackService.handleCallback(
      currentUrl,
      cookieState,
      cookieCodeVerifier,
      res,
      req,
    );

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    res.redirect(`${frontendUrl}/oauth/callback`);
  }

  @Get('accounts')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List linked OAuth accounts for current user' })
  listUserAccounts(@User() user: AuthUser) {
    return this.listOauthAccountsService.listAccounts(user.id);
  }

  @Post('accounts/unlink')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink an OAuth account' })
  unlinkAccount(@User() user: AuthUser, @Body() dto: UnlinkOauthAccountDto) {
    return this.unlinkOauthAccountService.unlinkAccount(user.id, dto.provider);
  }
}
