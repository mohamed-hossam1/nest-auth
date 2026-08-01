import { Module, forwardRef } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TokensModule } from 'src/tokens/tokens.module';
import { BanUserService } from './services/ban-user.service';
import { UnbanUserService } from './services/unban-user.service';
import { DeleteUserService } from './services/delete-user.service';
import { DeleteMeService } from './services/delete-me.service';
import { UpdateUserService } from './services/update-user.service';
import { UpdateMeService } from './services/update-me.service';
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
    DeleteMeService,
    UpdateUserService,
    UpdateMeService,
    BanUserService,
    UnbanUserService,
    AuthGuard,
    RolesGuard,
  ],
  exports: [UsersRepository, RefreshSessionsRepository, AuthTokensRepository],
})
export class UsersModule {}
