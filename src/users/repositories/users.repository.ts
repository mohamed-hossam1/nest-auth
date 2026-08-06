import { Injectable } from '@nestjs/common';
import {
  eq,
  and,
  or,
  ilike,
  count,
  asc,
  desc,
  isNull,
  type SQL,
} from 'drizzle-orm';
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

  async createIdempotent(
    data: NewUser,
    executor: DbExecutor = db,
  ): Promise<UserWithRole | null> {
    const [user] = await executor
      .insert(users)
      .values({
        ...data,
        email: normalizeEmail(data.email),
      })
      .onConflictDoNothing()
      .returning();

    return user ?? null;
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
      .where(and(eq(userBans.userId, userId), isNull(userBans.unbannedAt)))
      .orderBy(desc(userBans.bannedAt))
      .limit(1);

    return ban ?? null;
  }

  async findBanHistoryByUserId(
    userId: string,
    executor: DbExecutor = db,
  ): Promise<UserBan[]> {
    return await executor
      .select()
      .from(userBans)
      .where(eq(userBans.userId, userId))
      .orderBy(desc(userBans.bannedAt));
  }

  async banUser(
    userId: string,
    banReason: string,
    executor: DbExecutor = db,
  ): Promise<{ user: UserWithRole; ban: UserBan; banHistory: UserBan[] }> {
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

    const banHistory = await this.findBanHistoryByUserId(userId, executor);

    return { user, ban, banHistory };
  }

  async findAllPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    status?: 'active' | 'banned';
    role?: 'user' | 'admin';
    sortBy: 'createdAt' | 'name' | 'email';
    sortOrder: 'asc' | 'desc';
  }): Promise<{
    data: Array<{ user: UserWithRole; ban: UserBan | null }>;
    total: number;
  }> {
    const conditions: SQL[] = [];

    if (params.search && params.search.trim() !== '') {
      const q = `%${params.search.trim()}%`;
      const searchCondition = or(ilike(users.email, q), ilike(users.name, q));
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (params.status === 'active') {
      conditions.push(eq(users.isBanned, false));
    } else if (params.status === 'banned') {
      conditions.push(eq(users.isBanned, true));
    }

    if (params.role) {
      conditions.push(eq(users.role, params.role));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      params.sortBy === 'name'
        ? users.name
        : params.sortBy === 'email'
          ? users.email
          : users.createdAt;
    const orderFn = params.sortOrder === 'asc' ? asc : desc;

    const [countResult] = await db
      .select({ total: count() })
      .from(users)
      .where(whereClause);

    const rows = await db
      .select({ user: users, ban: userBans })
      .from(users)
      .leftJoin(
        userBans,
        and(eq(users.id, userBans.userId), isNull(userBans.unbannedAt)),
      )
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .offset((params.page - 1) * params.limit)
      .limit(params.limit);

    return {
      data: rows.map((row) => ({
        user: row.user,
        ban: row.ban,
      })),
      total: countResult.total,
    };
  }

  async findByIdWithBan(
    id: string,
    executor: DbExecutor = db,
  ): Promise<{
    user: UserWithRole;
    ban: UserBan | null;
    banHistory: UserBan[];
  } | null> {
    const user = await this.findById(id, executor);
    if (!user) return null;

    const ban = await this.findBanByUserId(id, executor);
    const banHistory = await this.findBanHistoryByUserId(id, executor);

    return { user, ban, banHistory };
  }

  async unbanUser(
    userId: string,
    executor: DbExecutor = db,
  ): Promise<{
    user: UserWithRole | null;
    banHistory: UserBan[];
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
      await executor
        .update(userBans)
        .set({ unbannedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(userBans.userId, userId), isNull(userBans.unbannedAt)));

      const banHistory = await this.findBanHistoryByUserId(userId, executor);
      return { user: updatedUser, banHistory, status: 'SUCCESS' };
    }

    const [userExists] = await executor
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userExists) {
      return { user: null, banHistory: [], status: 'NOT_FOUND' };
    }

    return { user: null, banHistory: [], status: 'NOT_BANNED' };
  }
}
