import { Injectable, NotFoundException } from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class DeleteUserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async delete(targetUserId: string) {
    const deletedUser = await this.usersRepository.delete(targetUserId);

    if (!deletedUser) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    return { message: AUTH_MESSAGES.USER_DELETED_SUCCESS };
  }
}
