import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import type { AuthUser } from 'src/common/types/auth-user.type';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UsersRepository } from '../repositories/users.repository';
import { toPublicUser } from '../utils/users.mapper';

@Injectable()
export class UpdateMeService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async updateMe(currentUser: AuthUser, dto: UpdateUserDto) {
    if (dto.name === undefined && dto.avatarUrl === undefined) {
      throw new BadRequestException(AUTH_MESSAGES.NO_FIELDS_TO_UPDATE);
    }

    const patch: { name?: string | null; avatarUrl?: string | null } = {};
    if (dto.name !== undefined) {
      patch.name = dto.name;
    }
    if (dto.avatarUrl !== undefined) {
      patch.avatarUrl = dto.avatarUrl;
    }

    const updated = await this.usersRepository.update(currentUser.id, patch);
    if (!updated) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    return {
      message: AUTH_MESSAGES.USER_UPDATED_SUCCESS,
      user: toPublicUser(updated, null),
    };
  }
}
