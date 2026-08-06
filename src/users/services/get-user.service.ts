import { Injectable, NotFoundException } from '@nestjs/common';
import { ADMIN_MESSAGES } from 'src/common/constants/messages.constant';
import { UsersRepository } from '../repositories/users.repository';
import { toPublicUser } from '../utils/users.mapper';

@Injectable()
export class GetUserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getUser(id: string) {
    const result = await this.usersRepository.findByIdWithBan(id);
    if (!result) {
      throw new NotFoundException(ADMIN_MESSAGES.USER_NOT_FOUND);
    }
    return { user: toPublicUser(result.user, result.ban, result.banHistory) };
  }
}
