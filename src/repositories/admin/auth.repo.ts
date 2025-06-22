import  db  from '@/libs/drizzleClient.lib';
import { authAccountsTable } from '@/models/auth/authAccount.model';
import { eq } from 'drizzle-orm';

class AdminAuthRepo {
  constructor() {}

  async getAuthAccountsByUserId(userId: number) {
    return await db
      .select()
      .from(authAccountsTable)
      .where(eq(authAccountsTable.userId, userId));
  }
}

export const adminAuthRepo = new AdminAuthRepo();
