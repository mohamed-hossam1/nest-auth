import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { normalizeEmail } from 'src/common/utils/email.util';
import { db, type DbTransaction } from 'src/db';
import {
  users,
  userBans,
  UserWithRole,
  type NewUser,
  type UserBan,
  type NewUserBan,
} from 'src/db/schema';

type DbExecutor = typeof db | DbTransaction;

@Injectable()
export class UsersRepository {
  private async selectUser(
    executor: DbExecutor,
    whereClause: ReturnType<typeof eq>,
  ): Promise<UserWithRole | null> {
    const [user] = await executor
      .select()
      .from(users)
      .where(whereClause)
      .limit(1);

    return user ?? null;
  }

  async findByEmail(
    email: string,
    executor: DbExecutor = db,
  ): Promise<UserWithRole | null> {
    return this.selectUser(executor, eq(users.email, normalizeEmail(email)));
  }

  async findById(
    id: string,
    executor: DbExecutor = db,
  ): Promise<UserWithRole | null> {
    return this.selectUser(executor, eq(users.id, id));
  }

  async findAll(): Promise<UserWithRole[]> {
    return db.select().from(users);
  }

  async create(
    data: NewUser,
    executor: DbExecutor = db,
  ): Promise<UserWithRole> {
    const [user] = await executor
      .insert(users)
      .values({
        ...data,
        email: normalizeEmail(data.email),
      })
      .returning();

    if (!user) {
      throw new Error('Failed to create user');
    }

    return user;
  }

  async update(
    id: string,
    data: Partial<NewUser>,
    executor: DbExecutor = db,
  ): Promise<UserWithRole | null> {
    const patch =
      data.email !== undefined
        ? { ...data, email: normalizeEmail(data.email) }
        : data;

    const [user] = await executor
      .update(users)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return user ?? null;
  }

  async delete(
    id: string,
    executor: DbExecutor = db,
  ): Promise<UserWithRole | null> {
    const [user] = await executor
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  }

  async findBanByUserId(
    userId: string,
    executor: DbExecutor = db,
  ): Promise<UserBan | null> {
    const [ban] = await executor
      .select()
      .from(userBans)
      .where(eq(userBans.userId, userId))
      .limit(1);

    return ban ?? null;
  }

  async banUser(
    userId: string,
    banReason: string,
    executor: DbExecutor = db,
  ): Promise<{ user: UserWithRole; ban: UserBan }> {
    const [ban] = await executor
      .insert(userBans)
      .values({
        userId,
        banReason,
      } satisfies NewUserBan)
      .returning();

    const [user] = await executor
      .update(users)
      .set({
        isBanned: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!user || !ban) {
      throw new Error('Failed to ban user');
    }

    return { user, ban };
  }

  async unbanUser(
    userId: string,
    executor: DbExecutor = db,
  ): Promise<{
    user: UserWithRole | null;
    status: 'SUCCESS' | 'NOT_FOUND' | 'NOT_BANNED';
  }> {
    const [updatedUser] = await executor
      .update(users)
      .set({
        isBanned: false,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), eq(users.isBanned, true)))
      .returning();

    if (updatedUser) {
      await executor.delete(userBans).where(eq(userBans.userId, userId));
      return { user: updatedUser, status: 'SUCCESS' };
    }

    const [userExists] = await executor
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userExists) {
      return { user: null, status: 'NOT_FOUND' };
    }

    return { user: null, status: 'NOT_BANNED' };
  }
}
