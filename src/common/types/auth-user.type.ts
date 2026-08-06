import type { UserRole } from 'src/db/schema';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isVerified: boolean;
  isBanned: boolean;
  sessionId?: string;
};
