import type { UserRole } from 'src/db/schema';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};
