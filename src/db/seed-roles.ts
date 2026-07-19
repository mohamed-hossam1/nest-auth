import { eq } from 'drizzle-orm';
import { db } from './index';
import { roles } from './schema';

const DEFAULT_ROLES = ['user', 'admin'] as const;

export async function ensureDefaultRoles(): Promise<void> {
  for (const name of DEFAULT_ROLES) {
    const [existing] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1);

    if (!existing) {
      await db.insert(roles).values({ name });
    }
  }
}
