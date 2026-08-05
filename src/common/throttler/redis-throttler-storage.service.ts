import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisThrottlerStorageService implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorageService.name);

  constructor(private readonly redisService: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redis = this.redisService.getClient();
    const hitKey = `throttler:${throttlerName}:${key}`;
    const blockKey = `throttler:${throttlerName}:${key}:blocked`;

    const blockTtl = await redis.pttl(blockKey);
    if (blockTtl > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: Math.ceil(blockTtl / 1000),
        isBlocked: true,
        timeToBlockExpire: Math.ceil(blockTtl / 1000),
      };
    }

    const totalHits = await redis.incr(hitKey);

    if (totalHits === 1) {
      await redis.pexpire(hitKey, ttl);
    }

    let pttl = await redis.pttl(hitKey);
    if (pttl < 0) {
      pttl = ttl;
      await redis.pexpire(hitKey, ttl);
    }

    const timeToExpire = Math.ceil(pttl / 1000);

    if (totalHits > limit) {
      const timeToBlockExpire =
        blockDuration > 0 ? Math.ceil(blockDuration / 1000) : timeToExpire;
      if (blockDuration > 0) {
        await redis.psetex(blockKey, blockDuration, '1');
      }

      return {
        totalHits,
        timeToExpire,
        isBlocked: true,
        timeToBlockExpire,
      };
    }

    return {
      totalHits,
      timeToExpire,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
