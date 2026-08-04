import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { RedisService } from '../redis/redis.service';

interface CachedResponse {
  statusCode: number;
  body: any;
}

const HEADER_NAME = 'x-idempotency-key';
const DEFAULT_TTL_SECONDS = 86400;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly redisService: RedisService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const rawHeader =
      req.headers[HEADER_NAME] || req.headers['idempotency-key'];
    const idempotencyKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!idempotencyKey || !idempotencyKey.trim()) {
      return next.handle();
    }

    const cleanKey = idempotencyKey.trim();
    const redisKey = `idempotency:${req.method}:${req.path}:${cleanKey}`;

    const existing = await this.redisService.get(redisKey);

    if (existing === 'IN_PROGRESS') {
      throw new ConflictException(
        'A request with this Idempotency-Key is currently being processed.',
      );
    }

    if (existing) {
      try {
        const cached: CachedResponse = JSON.parse(existing);
        res.status(cached.statusCode);
        return of(cached.body);
      } catch {
        await this.redisService.del(redisKey);
      }
    }

    const acquired = await this.redisService.setNxEx(
      redisKey,
      'IN_PROGRESS',
      30,
    );
    if (!acquired) {
      throw new ConflictException(
        'A request with this Idempotency-Key is currently being processed.',
      );
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const cachePayload: CachedResponse = {
            statusCode: res.statusCode || 200,
            body: data,
          };
          void this.redisService.set(
            redisKey,
            JSON.stringify(cachePayload),
            DEFAULT_TTL_SECONDS,
          );
        },
        error: () => {
          void this.redisService.del(redisKey);
        },
      }),
    );
  }
}
