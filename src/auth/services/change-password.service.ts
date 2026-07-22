import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { db } from 'src/db';
import { HashingService } from 'src/hashing/hashing.service';
import { UsersService } from 'src/users/users.service';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { AuthUser } from 'src/common/types/auth-user.type';

@Injectable()
export class ChangePasswordService {
  constructor(
    private readonly userService: UsersService,
    private readonly hashingService: HashingService,
  ) {}

  async changePassword(user: AuthUser, changePasswordDto: ChangePasswordDto) {
    const existingUser = await this.userService.findById(user.id);

    if (!existingUser) {
      throw new UnauthorizedException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    const passwordValid = await this.hashingService.compare(
      changePasswordDto.oldPassword,
      existingUser.passwordHash,
    );

    if (!passwordValid) {
      throw new UnauthorizedException(AUTH_MESSAGES.CURRENT_PASSWORD_INVALID);
    }

    const isSame = await this.hashingService.compare(
      changePasswordDto.newPassword,
      existingUser.passwordHash,
    );

    if (isSame) {
      throw new ConflictException(
        AUTH_MESSAGES.CURRENT_PASSWORD_AND_NEW_PASSWORD_ARE_THE_SAME,
      );
    }

    const passwordHash = await this.hashingService.hash(
      changePasswordDto.newPassword,
    );

    await db.transaction(async (tx) => {
      await this.userService.update(existingUser.id, { passwordHash }, tx);
      await this.userService.revokeAllRefreshSessions(existingUser.id, tx);
    });

    return { message: AUTH_MESSAGES.CHANGE_PASSWORD_SUCCESS };
  }
}
