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

@Injectable()
export class SetPasswordService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
    private readonly hashingService: HashingService,
  ) {}

  async setPassword(user: AuthUser, setPasswordDto: SetPasswordDto) {
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
      await this.refreshSessionsRepository.revokeAll(existingUser.id, tx);
    });

    return { message: AUTH_MESSAGES.SET_PASSWORD_SUCCESS };
  }
}
