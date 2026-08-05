import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { HashingModule } from './hashing/hashing.module';
import { TokensModule } from './tokens/tokens.module';
import { RedisModule } from './common/redis/redis.module';
import { RedisService } from './common/redis/redis.service';
import { RedisThrottlerStorageService } from './common/throttler/redis-throttler-storage.service';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60000,
            limit: 60,
          },
        ],
        storage: new RedisThrottlerStorageService(redisService),
      }),
    }),
    UsersModule,
    EmailModule,
    AuthModule,
    HashingModule,
    TokensModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
