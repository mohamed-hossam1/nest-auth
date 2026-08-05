import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { getClientIp } from '../utils/request.util';
import { COMMON_MESSAGES } from '../constants/messages.constant';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const expressReq = req as Request;
    const ip =
      getClientIp(expressReq.headers?.['x-forwarded-for'], expressReq.ip) ??
      '127.0.0.1';

    const userId = (expressReq as any).user?.id;
    return Promise.resolve(userId ? `user:${userId}:${ip}` : `ip:${ip}`);
  }

  protected throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: any,
  ): Promise<void> {
    throw new HttpException(
      COMMON_MESSAGES.TOO_MANY_REQUESTS,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
