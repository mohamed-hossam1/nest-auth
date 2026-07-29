import { type User, type UserBan } from 'src/db/schema';

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: User['role'];
  isVerified: boolean;
  isBanned: boolean;
  ban: { bannedAt: Date; banReason: string } | null;
};

export function toPublicUser(user: User, ban: UserBan | null): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isVerified: user.isVerified,
    isBanned: user.isBanned,
    ban: ban
      ? {
          bannedAt: ban.bannedAt,
          banReason: ban.banReason,
        }
      : null,
  };
}
