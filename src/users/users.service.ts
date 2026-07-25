import { Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, ne } from 'drizzle-orm';
import { normalizeEmail } from 'src/common/utils/email.util';
import { db, type DbTransaction } from 'src/db';
import {
  emailVerificationTokens,
  NewUser,
  passwordResetTokens,
  refreshSessions,
  userBans,
  users,
  UserWithRole,
  type NewEmailVerificationToken,
  type NewPasswordResetToken,
  type NewRefreshSession,
  type NewUserBan,
  type RefreshSession,
  type UserBan,
} from 'src/db/schema';

type DbExecutor = typeof db | DbTransaction;

@Injectable()
export class UsersService {
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

  async delete(id: string, executor: DbExecutor = db) {
    return executor.delete(users).where(eq(users.id, id));
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
  ): Promise<UserWithRole | null> {
    await executor.delete(userBans).where(eq(userBans.userId, userId));

    const [user] = await executor
      .update(users)
      .set({
        isBanned: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return user ?? null;
  }

  async findEmailVerificationTokenById(id: string) {
    const [row] = await db
      .select({
        token: emailVerificationTokens,
        user: users,
      })
      .from(emailVerificationTokens)
      .innerJoin(users, eq(emailVerificationTokens.userId, users.id))
      .where(eq(emailVerificationTokens.id, id))
      .limit(1);

    if (!row) {
      return null;
    }

    return { token: row.token, user: row.user };
  }

  async findEmailVerificationTokenByUserId(
    userId: string,
    executor: DbExecutor = db,
  ) {
    const [token] = await executor
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, userId))
      .limit(1);

    return token ?? null;
  }

  async upsertEmailVerificationToken(
    data: NewEmailVerificationToken,
    executor: DbExecutor = db,
  ) {
    const [token] = await executor
      .insert(emailVerificationTokens)
      .values(data)
      .onConflictDoUpdate({
        target: emailVerificationTokens.userId,
        set: {
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          updatedAt: new Date(),
        },
      })
      .returning();

    return token;
  }

  async deleteEmailVerificationToken(
    userId: string,
    executor: DbExecutor = db,
  ) {
    return executor
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, userId));
  }

  async findPasswordResetTokenById(id: string) {
    const [row] = await db
      .select({
        token: passwordResetTokens,
        user: users,
      })
      .from(passwordResetTokens)
      .innerJoin(users, eq(passwordResetTokens.userId, users.id))
      .where(eq(passwordResetTokens.id, id))
      .limit(1);

    if (!row) {
      return null;
    }

    return { token: row.token, user: row.user };
  }

  async findPasswordResetTokenByUserId(
    userId: string,
    executor: DbExecutor = db,
  ) {
    const [token] = await executor
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId))
      .limit(1);

    return token ?? null;
  }

  async upsertPasswordResetToken(
    data: NewPasswordResetToken,
    executor: DbExecutor = db,
  ) {
    const [token] = await executor
      .insert(passwordResetTokens)
      .values(data)
      .onConflictDoUpdate({
        target: passwordResetTokens.userId,
        set: {
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          updatedAt: new Date(),
        },
      })
      .returning();

    return token;
  }

  async deletePasswordResetToken(userId: string, executor: DbExecutor = db) {
    return executor
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
  }

  async createRefreshSession(
    data: NewRefreshSession,
    executor: DbExecutor = db,
  ): Promise<RefreshSession> {
    const [session] = await executor
      .insert(refreshSessions)
      .values(data)
      .returning();

    return session;
  }

  async findRefreshSessionById(
    id: string,
    executor: DbExecutor = db,
  ): Promise<RefreshSession | null> {
    const [session] = await executor
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.id, id))
      .limit(1);

    return session ?? null;
  }

  async updateRefreshSession(
    id: string,
    data: Partial<NewRefreshSession> & { revokedAt?: Date | null },
    executor: DbExecutor = db,
  ): Promise<RefreshSession | null> {
    const [session] = await executor
      .update(refreshSessions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(refreshSessions.id, id))
      .returning();

    return session ?? null;
  }

  async revokeRefreshSession(id: string, executor: DbExecutor = db) {
    return this.updateRefreshSession(id, { revokedAt: new Date() }, executor);
  }

  async findActiveRefreshSessionsByUserId(
    userId: string,
    executor: DbExecutor = db,
  ): Promise<RefreshSession[]> {
    return executor
      .select()
      .from(refreshSessions)
      .where(
        and(
          eq(refreshSessions.userId, userId),
          isNull(refreshSessions.revokedAt),
          gt(refreshSessions.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(refreshSessions.updatedAt));
  }

  async findActiveRefreshSessionForUser(
    sessionId: string,
    userId: string,
    executor: DbExecutor = db,
  ): Promise<RefreshSession | null> {
    const [session] = await executor
      .select()
      .from(refreshSessions)
      .where(
        and(
          eq(refreshSessions.id, sessionId),
          eq(refreshSessions.userId, userId),
          isNull(refreshSessions.revokedAt),
        ),
      )
      .limit(1);

    return session ?? null;
  }

  async revokeAllRefreshSessions(userId: string, executor: DbExecutor = db) {
    return executor
      .update(refreshSessions)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(refreshSessions.userId, userId),
          isNull(refreshSessions.revokedAt),
        ),
      );
  }

  async revokeAllRefreshSessionsExcept(
    userId: string,
    exceptSessionId: string,
    executor: DbExecutor = db,
  ) {
    return executor
      .update(refreshSessions)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(refreshSessions.userId, userId),
          isNull(refreshSessions.revokedAt),
          ne(refreshSessions.id, exceptSessionId),
        ),
      );
  }

  async deleteRefreshSession(id: string, executor: DbExecutor = db) {
    return executor.delete(refreshSessions).where(eq(refreshSessions.id, id));
  }
}
