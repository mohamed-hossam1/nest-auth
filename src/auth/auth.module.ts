import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HashingModule } from 'src/hashing/hashing.module';
import { TokensModule } from 'src/tokens/tokens.module';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/email/email.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [AuthService],
  imports: [
    HashingModule,
    TokensModule,
    UsersModule,
    EmailModule,
    ConfigModule,
  ],
})
export class AuthModule {}
