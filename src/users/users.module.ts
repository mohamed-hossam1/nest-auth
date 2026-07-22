import { Module, forwardRef } from '@nestjs/common';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TokensModule } from 'src/tokens/tokens.module';
import { DeleteUserService } from './services/delete-user.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [forwardRef(() => TokensModule)],
  controllers: [UsersController],
  providers: [UsersService, DeleteUserService, AccessTokenGuard, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
