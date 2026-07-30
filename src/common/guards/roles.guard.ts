import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UserRole as Role } from '../../db/schema';
import type { AuthUser } from '../types/auth-user.type';
import { AUTH_MESSAGES } from '../constants/messages.constant';

type RequestWithUser = Request & { user?: AuthUser };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (!user) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_ACCESS_TOKEN);
    }

    const isAllowed = requiredRoles.includes(user.role);
    if (!isAllowed) {
      throw new ForbiddenException(AUTH_MESSAGES.FORBIDDEN);
    }

    return true;
  }
}
