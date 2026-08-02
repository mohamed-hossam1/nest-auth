import { Injectable } from '@nestjs/common';
import { OauthAccountsRepository } from 'src/users/repositories/oauth-accounts.repository';

@Injectable()
export class ListOauthAccountsService {
  constructor(
    private readonly oauthAccountsRepository: OauthAccountsRepository,
  ) {}

  async listAccounts(userId: string) {
    const accounts =
      await this.oauthAccountsRepository.findByUserId(userId);

    return accounts.map((acc) => ({
      id: acc.id,
      provider: acc.provider,
      providerUserId: acc.providerUserId,
    }));
  }
}
