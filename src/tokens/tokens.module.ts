import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TokensService } from './tokens.service';
import { UsersModule } from 'src/users/users.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [JwtModule, ConfigModule, UsersModule],
  providers: [TokensService],
  exports: [TokensService, JwtModule],
})
export class TokensModule {}
