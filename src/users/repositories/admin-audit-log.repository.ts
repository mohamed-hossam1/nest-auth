import { Injectable } from '@nestjs/common';
import { db, type DbTransaction } from 'src/db';
import {
  adminAuditLogs,
  type NewAdminAuditLog,
  type AdminAuditLog,
} from 'src/db/schema';

type DbExecutor = typeof db | DbTransaction;

@Injectable()
export class AdminAuditLogRepository {
  async create(
    data: NewAdminAuditLog,
    executor: DbExecutor = db,
  ): Promise<AdminAuditLog> {
    const [log] = await executor
      .insert(adminAuditLogs)
      .values(data)
      .returning();
    return log;
  }
}
