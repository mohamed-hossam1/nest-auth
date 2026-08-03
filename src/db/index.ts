import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export const db = drizzle(process.env.DATABASE_URL!, {
  schema,
} as unknown as NonNullable<Parameters<typeof drizzle>[1]>);

export type Database = typeof db;
export type DbTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];
