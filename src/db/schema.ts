import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

export type UserRole = (typeof userRoleEnum.enumValues)[number];

export const Roles = {
  USER: 'user',
  ADMIN: 'admin',
} as const satisfies Record<string, UserRole>;

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    role: userRoleEnum('role').notNull().default('user'),
    isVerified: boolean('is_verified').notNull().default(false),
    isBanned: boolean('is_banned').notNull().default(false),
    ...timestamps,
  },
  (table) => [index('users_role_idx').on(table.role)],
);

export const userBans = pgTable('user_bans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  bannedAt: timestamp('banned_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  banReason: text('ban_reason').notNull(),
  ...timestamps,
});

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index('email_verification_tokens_token_hash_idx').on(table.tokenHash),
  ],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index('password_reset_tokens_token_hash_idx').on(table.tokenHash),
  ],
);

export const refreshSessions = pgTable(
  'refresh_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    deviceName: text('device_name'),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('refresh_sessions_user_id_idx').on(table.userId),
    index('refresh_sessions_token_hash_idx').on(table.tokenHash),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserWithRole = User;

export type UserBan = typeof userBans.$inferSelect;
export type NewUserBan = typeof userBans.$inferInsert;

export type EmailVerificationToken =
  typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken =
  typeof emailVerificationTokens.$inferInsert;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export type RefreshSession = typeof refreshSessions.$inferSelect;
export type NewRefreshSession = typeof refreshSessions.$inferInsert;
