import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/db/schema';
import { BcryptService } from 'src/hashing/bcrypt.service';
import { UsersService } from 'src/users/users.service';
import { Response } from 'express';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';

type JwtPayload = {
  email: string;
  name: string;
  role: string;
};

@Injectable()
export class TokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly bcryptService: BcryptService,
    private readonly usersService: UsersService,
  ) {}

  async generateTokens(user: User) {
    const payload: JwtPayload = {
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });
    return { accessToken, refreshToken };
  }

  async saveRefreshToken(userId: string, refreshToken: string) {
    const refreshTokenHash = await this.bcryptService.hash(refreshToken);
    await this.usersService.update(userId, { refreshTokenHash });
  }

  async compareRefreshToken(
    refreshToken: string,
    refreshTokenHash: string,
  ): Promise<boolean> {
    return this.bcryptService.compare(refreshToken, refreshTokenHash);
  }

  setRefreshTokenToCookie(res: Response, refreshToken: string) {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  async refreshToken(refreshToken: string, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    const user = await this.usersService.findByEmail(payload.email);
    if (!user?.refreshTokenHash || !user.isVerified) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    const isValid = await this.compareRefreshToken(
      refreshToken,
      user.refreshTokenHash,
    );
    if (!isValid) {
      await this.usersService.update(user.id, { refreshTokenHash: null });
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    this.setRefreshTokenToCookie(res, tokens.refreshToken);

    return {
      message: AUTH_MESSAGES.REFRESH_SUCCESS,
      accessToken: tokens.accessToken,
    };
  }
}
