import  db from '@/libs/drizzleClient.lib';
import { usersTable } from '@/models/user.model';
import { eq, count } from 'drizzle-orm';

class AdminUserRepo {
  constructor() {}

  async getUserById(userId: number) {
    const user = await db.select().from(usersTable).where(eq(usersTable.userId, userId)).limit(1);
    return user[0];
  };

  async updateUserActive(userId: number, isActive: boolean) {
    const updated = await db
      .update(usersTable)
      .set({ isActive })
      .where(eq(usersTable.userId, userId))
      .returning();
    return updated[0];
  };

  async updateUserRole(userId: number, role: 'user' | 'admin') {
    const updated = await db
      .update(usersTable)
      .set({ role })
      .where(eq(usersTable.userId, userId))
      .returning();
    return updated[0];
  };

  async countUserStats() {
    const [total] = await db.select({ value: count() }).from(usersTable);
    const [active] = await db.select({ value: count() }).from(usersTable).where(eq(usersTable.isActive, true));
    const [verified] = await db.select({ value: count() }).from(usersTable).where(eq(usersTable.isVerified, true));
    const [onboarded] = await db
      .select({ value: count() })
      .from(usersTable)
      .where(eq(usersTable.hasCompletedOnboarding, true));
    const [newUsers] = await db
      .select({ value: count() })
      .from(usersTable)
      .where(eq(usersTable.isNewUser, true));

    return {
      total: total.value,
      active: active.value,
      verified: verified.value,
      onboarded: onboarded.value,
      newUsers: newUsers.value,
    };
  };

}

export const adminUserRepo = new AdminUserRepo();
