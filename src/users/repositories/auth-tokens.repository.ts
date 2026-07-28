import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { normalizeEmail } from 'src/common/utils/email.util';
import { db, type DbTransaction } from 'src/db';
import {
  emailVerificationTokens,
  passwordResetTokens,
  users,
  userBans,
  UserWithRole,
  type EmailVerificationToken,
  type NewEmailVerificationToken,
  type PasswordResetToken,
  type NewPasswordResetToken,
} from 'src/db/schema';

type DbExecutor = typeof db | DbTransaction;

@Injectable()
export class AuthTokensRepository {
  async findEmailVerificationTokenById(id: string) {
    const [row] = await db
      .select({
        token: emailVerificationTokens,
        user: users,
        ban: userBans,
      })
      .from(emailVerificationTokens)
      .innerJoin(users, eq(emailVerificationTokens.userId, users.id))
      .leftJoin(userBans, eq(users.id, userBans.userId))
      .where(eq(emailVerificationTokens.id, id))
      .limit(1);

    if (!row) {
      return null;
    }

    return { token: row.token, user: row.user, ban: row.ban };
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

  async findUserWithVerificationToken(
    email: string,
    executor: DbExecutor = db,
  ): Promise<{
    user: UserWithRole;
    token: EmailVerificationToken | null;
  } | null> {
    const [row] = await executor
      .select({
        user: users,
        token: emailVerificationTokens,
      })
      .from(users)
      .leftJoin(
        emailVerificationTokens,
        eq(users.id, emailVerificationTokens.userId),
      )
      .where(eq(users.email, normalizeEmail(email)))
      .limit(1);

    if (!row) return null;
    return { user: row.user, token: row.token };
  }

  async findUserWithPasswordResetToken(
    email: string,
    executor: DbExecutor = db,
  ): Promise<{
    user: UserWithRole;
    token: PasswordResetToken | null;
  } | null> {
    const [row] = await executor
      .select({
        user: users,
        token: passwordResetTokens,
      })
      .from(users)
      .leftJoin(passwordResetTokens, eq(users.id, passwordResetTokens.userId))
      .where(eq(users.email, normalizeEmail(email)))
      .limit(1);

    if (!row) return null;
    return { user: row.user, token: row.token };
  }
}
