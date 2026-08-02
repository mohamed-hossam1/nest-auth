import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { db, type DbTransaction } from 'src/db';
import {
  oauthAccounts,
  users,
  UserWithRole,
  type OauthAccount,
  type NewOauthAccount,
} from 'src/db/schema';

type DbExecutor = typeof db | DbTransaction;

@Injectable()
export class OauthAccountsRepository {
  async findUserByProvider(
    provider: string,
    providerUserId: string,
    executor: DbExecutor = db,
  ): Promise<{ user: UserWithRole; oauthAccount: OauthAccount } | null> {
    const [result] = await executor
      .select({
        user: users,
        oauthAccount: oauthAccounts,
      })
      .from(oauthAccounts)
      .innerJoin(users, eq(users.id, oauthAccounts.userId))
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerUserId, providerUserId),
        ),
      )
      .limit(1);

    return result ?? null;
  }

  async findByUserId(
    userId: string,
    executor: DbExecutor = db,
  ): Promise<OauthAccount[]> {
    return executor
      .select()
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId));
  }

  async findByUserIdAndProvider(
    userId: string,
    provider: string,
    executor: DbExecutor = db,
  ): Promise<OauthAccount | null> {
    const [account] = await executor
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.userId, userId),
          eq(oauthAccounts.provider, provider),
        ),
      )
      .limit(1);
    return account ?? null;
  }

  async create(
    data: NewOauthAccount,
    executor: DbExecutor = db,
  ): Promise<OauthAccount> {
    const [account] = await executor
      .insert(oauthAccounts)
      .values(data)
      .returning();

    if (!account) {
      throw new Error('Failed to create oauth account');
    }

    return account;
  }

  async createIdempotent(
    data: NewOauthAccount,
    executor: DbExecutor = db,
  ): Promise<OauthAccount | null> {
    const [account] = await executor
      .insert(oauthAccounts)
      .values(data)
      .onConflictDoNothing()
      .returning();

    return account ?? null;
  }

  async delete(
    id: string,
    executor: DbExecutor = db,
  ): Promise<OauthAccount | null> {
    const [account] = await executor
      .delete(oauthAccounts)
      .where(eq(oauthAccounts.id, id))
      .returning();
    return account ?? null;
  }
}
