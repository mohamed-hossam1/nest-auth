import { eq } from 'drizzle-orm';
import { db } from './index';
import { roles } from './schema';

const DEFAULT_ROLES = ['user', 'admin'] as const;

async function retry<T>(
  fn: () => Promise<T>,
  retries = 5,
  delay = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    console.warn(
      `Database connection/query failed. Retrying in ${delay}ms... (Remaining retries: ${retries})`,
      error instanceof Error ? error.message : error,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 2);
  }
}

export async function ensureDefaultRoles(): Promise<void> {
  await retry(async () => {
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
  });
}
