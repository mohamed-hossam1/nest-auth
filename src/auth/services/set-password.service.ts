import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { db } from 'src/db';
import { HashingService } from 'src/hashing/hashing.service';
import { UsersRepository } from 'src/users/repositories/users.repository';
import { RefreshSessionsRepository } from 'src/users/repositories/refresh-sessions.repository';
import { SetPasswordDto } from '../dtos/set-password.dto';
import { AuthUser } from 'src/common/types/auth-user.type';
import { TokensService } from 'src/tokens/tokens.service';

@Injectable()
export class SetPasswordService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
    private readonly hashingService: HashingService,
    private readonly tokensService: TokensService,
  ) {}

  async setPassword(
    user: AuthUser,
    setPasswordDto: SetPasswordDto,
    refreshToken?: string,
  ) {
    const existingUser = await this.usersRepository.findById(user.id);

    if (!existingUser) {
      throw new UnauthorizedException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    if (existingUser.passwordHash) {
      throw new ConflictException(AUTH_MESSAGES.PASSWORD_ALREADY_SET);
    }

    const passwordHash = await this.hashingService.hash(
      setPasswordDto.password,
    );

    await db.transaction(async (tx) => {
      await this.usersRepository.update(existingUser.id, { passwordHash }, tx);

      if (setPasswordDto.revokeOtherSessions) {
        const currentSessionId =
          await this.tokensService.getSessionIdFromRefreshToken(
            refreshToken,
            existingUser.id,
          );

        if (currentSessionId) {
          await this.refreshSessionsRepository.revokeAllExcept(
            existingUser.id,
            currentSessionId,
            tx,
          );
        }
      }
    });

    return { message: AUTH_MESSAGES.SET_PASSWORD_SUCCESS };
  }
}
