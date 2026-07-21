import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UsersService } from 'src/users/users.service';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { AuthUser } from 'src/common/types/auth-user.type';
import type { UserRole } from 'src/db/schema';

type JwtPayload = {
  sub?: string;
  email: string;
  name: string | null;
  role: UserRole;
};

type RequestWithUser = Request & { user?: AuthUser };

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractAccessToken(request);

    if (!token) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_ACCESS_TOKEN);
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });

      const user = await this.usersService.findByEmail(payload.email);
      if (!user?.isVerified) {
        throw new UnauthorizedException(AUTH_MESSAGES.INVALID_ACCESS_TOKEN);
      }

      request.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };

      return true;
    } catch {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_ACCESS_TOKEN);
    }
  }

  private extractAccessToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
