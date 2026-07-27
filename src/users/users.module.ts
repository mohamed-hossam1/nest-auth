import { Module, forwardRef } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TokensModule } from 'src/tokens/tokens.module';
import { BanUserService } from './services/ban-user.service';
import { DeleteUserService } from './services/delete-user.service';
import { UpdateUserService } from './services/update-user.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './repositories/users.repository';
import { RefreshSessionsRepository } from './repositories/refresh-sessions.repository';
import { AuthTokensRepository } from './repositories/auth-tokens.repository';

@Module({
  imports: [forwardRef(() => TokensModule)],
  controllers: [UsersController],
  providers: [
    UsersRepository,
    RefreshSessionsRepository,
    AuthTokensRepository,
    DeleteUserService,
    UpdateUserService,
    BanUserService,
    AuthGuard,
    RolesGuard,
  ],
  exports: [UsersRepository, RefreshSessionsRepository, AuthTokensRepository],
})
export class UsersModule {}
