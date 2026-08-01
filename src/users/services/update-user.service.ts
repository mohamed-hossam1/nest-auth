import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUTH_MESSAGES } from 'src/common/constants/messages.constant';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UsersRepository } from '../repositories/users.repository';
import { toPublicUser } from '../utils/users.mapper';

@Injectable()
export class UpdateUserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async update(targetUserId: string, dto: UpdateUserDto) {
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

    const updated = await this.usersRepository.update(targetUserId, patch);
    if (!updated) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    const ban = updated.isBanned
      ? await this.usersRepository.findBanByUserId(updated.id)
      : null;

    return {
      message: AUTH_MESSAGES.USER_UPDATED_SUCCESS,
      user: toPublicUser(updated, ban),
    };
  }
}
