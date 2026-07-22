import { Module, forwardRef } from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TokensModule } from 'src/tokens/tokens.module';
import { DeleteUserService } from './services/delete-user.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [forwardRef(() => TokensModule)],
  controllers: [UsersController],
  providers: [UsersService, DeleteUserService, AuthGuard, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
