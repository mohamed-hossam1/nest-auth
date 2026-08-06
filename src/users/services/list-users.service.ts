import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { ListUsersQueryDto } from '../dtos/list-users-query.dto';
import { toPublicUser } from '../utils/users.mapper';

@Injectable()
export class ListUsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async list(query: ListUsersQueryDto) {
    const { data, total } = await this.usersRepository.findAllPaginated({
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      role: query.role,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      users: data.map(({ user, ban }) => toPublicUser(user, ban)),
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems: total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
