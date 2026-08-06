import { type User, type UserBan } from 'src/db/schema';

export type BanRecord = {
  id: string;
  bannedAt: Date;
  unbannedAt: Date | null;
  banReason: string;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: User['role'];
  isVerified: boolean;
  isBanned: boolean;
  hasPassword: boolean;
  createdAt: string;
  ban: BanRecord | null;
  banHistory: BanRecord[];
};

export function toPublicUser(
  user: User,
  ban: UserBan | null,
  banHistory: UserBan[] = [],
): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isVerified: user.isVerified,
    isBanned: user.isBanned,
    hasPassword: user.passwordHash !== null,
    createdAt: user.createdAt.toISOString(),
    ban: ban
      ? {
          id: ban.id,
          bannedAt: ban.bannedAt,
          unbannedAt: ban.unbannedAt ?? null,
          banReason: ban.banReason,
        }
      : null,
    banHistory: banHistory.map((b) => ({
      id: b.id,
      bannedAt: b.bannedAt,
      unbannedAt: b.unbannedAt ?? null,
      banReason: b.banReason,
    })),
  };
}
