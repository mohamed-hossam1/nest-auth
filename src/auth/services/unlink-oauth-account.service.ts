import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from 'src/users/repositories/users.repository';
import { OauthAccountsRepository } from 'src/users/repositories/oauth-accounts.repository';

@Injectable()
export class UnlinkOauthAccountService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly oauthAccountsRepository: OauthAccountsRepository,
  ) {}

  async unlinkAccount(userId: string, provider: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const accounts = await this.oauthAccountsRepository.findByUserId(userId);
    const targetAccount = accounts.find((acc) => acc.provider === provider);

    if (!targetAccount) {
      throw new NotFoundException('OAuth account not linked');
    }

    const hasPassword = Boolean(user.passwordHash);
    const remainingAccountsCount = accounts.length - 1;

    if (!hasPassword && remainingAccountsCount === 0) {
      throw new BadRequestException(
        'Cannot disconnect the last remaining sign-in method. You must set up another sign-in method first.',
      );
    }

    await this.oauthAccountsRepository.delete(targetAccount.id);

    return { message: 'Account unlinked successfully' };
  }
}
