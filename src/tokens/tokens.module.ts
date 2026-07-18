import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TokensService } from './tokens.service';
import { HashingModule } from 'src/hashing/hashing.module';
import { UsersModule } from 'src/users/users.module';
import { BcryptService } from 'src/hashing/bcrypt.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [JwtModule, ConfigModule, HashingModule, UsersModule],
  providers: [TokensService, BcryptService],
  exports: [TokensService, JwtModule],
})
export class TokensModule {}
