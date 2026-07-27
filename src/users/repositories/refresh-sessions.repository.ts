import { Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, ne } from 'drizzle-orm';
import { db, type DbTransaction } from 'src/db';
import {
  refreshSessions,
  users,
  type RefreshSession,
  type NewRefreshSession,
  type UserWithRole,
} from 'src/db/schema';

type DbExecutor = typeof db | DbTransaction;

@Injectable()
export class RefreshSessionsRepository {
  async create(
    data: NewRefreshSession,
    executor: DbExecutor = db,
  ): Promise<RefreshSession> {
    const [session] = await executor
      .insert(refreshSessions)
      .values(data)
      .returning();

    return session;
  }

  async findById(
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

  async update(
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

  async findActiveByUserId(
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

  async findActiveForUser(
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

  async revokeAll(userId: string, executor: DbExecutor = db) {
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

  async revokeAllExcept(
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

  async delete(id: string, executor: DbExecutor = db) {
    return executor.delete(refreshSessions).where(eq(refreshSessions.id, id));
  }

  async findSessionWithUser(
    sessionId: string,
    executor: DbExecutor = db,
  ): Promise<{ session: RefreshSession; user: UserWithRole } | null> {
    const [row] = await executor
      .select({
        session: refreshSessions,
        user: users,
      })
      .from(refreshSessions)
      .innerJoin(users, eq(refreshSessions.userId, users.id))
      .where(eq(refreshSessions.id, sessionId))
      .limit(1);

    return row ?? null;
  }
}
