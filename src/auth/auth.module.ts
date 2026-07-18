import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { HashingModule } from 'src/hashing/hashing.module';
import { TokensModule } from 'src/tokens/tokens.module';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/email/email.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HashingModule,
    TokensModule,
    UsersModule,
    EmailModule,
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
