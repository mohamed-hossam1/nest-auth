import {
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
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { TokensService } from 'src/tokens/tokens.service';
import { SignUpDto } from './dtos/sign-up.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import type { Request, Response } from 'express';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { User } from 'src/common/decorators/user.decorator';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { SignUpService } from './services/sign-up.service';
import { SignInService } from './services/sign-in.service';
import { VerifyEmailService } from './services/verify-email.service';
import { LogoutService } from './services/logout.service';
import { ForgotPasswordService } from './services/forgot-password.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly signUpService: SignUpService,
    private readonly signInService: SignInService,
    private readonly verifyEmailService: VerifyEmailService,
    private readonly logoutService: LogoutService,
    private readonly forgotPasswordService: ForgotPasswordService,
    private readonly tokensService: TokensService,
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
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.signInService.signIn(signInDto, res);
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address and auto sign in' })
  @ApiQuery({ name: 'token', required: true, type: String })
  verifyEmail(
    @Query('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.verifyEmailService.verifyEmail(token, res);
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

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  logout(@User() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    return this.logoutService.logout(user.id, res);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.forgotPasswordService.forgotPassword(forgotPasswordDto);
  }
}
