import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UsersRepository } from 'src/users/repositories/users.repository';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { AuthUser } from 'src/common/types/auth-user.type';
import { assertUserNotBanned } from 'src/common/utils/ban.util';
import type { UserRole } from 'src/db/schema';

type JwtPayload = {
  sub?: string;
  email: string;
  name: string | null;
  role: UserRole;
};

type RequestWithUser = Request & { user?: AuthUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractAccessToken(request);

    let userId: string | undefined;

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
          secret: this.configService.get('JWT_ACCESS_SECRET'),
        });
        userId = payload.sub;
      } catch {}
    }

    if (!userId && request.cookies?.refresh_token) {
      try {
        const refreshPayload = await this.jwtService.verifyAsync<{
          sub: string;
        }>(request.cookies.refresh_token, {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
        });
        userId = refreshPayload.sub;
      } catch {}
    }

    if (!userId) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_ACCESS_TOKEN);
    }

    try {
      const user = await this.usersRepository.findById(userId);
      if (!user?.isVerified) {
        throw new UnauthorizedException(AUTH_MESSAGES.INVALID_ACCESS_TOKEN);
      }

      if (user.isBanned) {
        const ban = await this.usersRepository.findBanByUserId(user.id);
        assertUserNotBanned({
          isBanned: true,
          banReason: ban?.banReason,
        });
      }

      request.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isVerified: user.isVerified,
        isBanned: user.isBanned,
      };

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_ACCESS_TOKEN);
    }
  }

  private extractAccessToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
