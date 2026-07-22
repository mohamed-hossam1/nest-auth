import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';
import { TokensService } from './tokens.service';

@Module({
  imports: [JwtModule, ConfigModule, forwardRef(() => UsersModule)],
  providers: [TokensService],
  exports: [TokensService, JwtModule],
})
export class TokensModule {}
