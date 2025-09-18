import { db } from '@/libs/drizzleClient.lib';
import { usersTable } from '@/models/user.model';
import { eq } from 'drizzle-orm';

export interface StreakData {
  userId: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: Date | null;
  streakFreezeUsed: boolean | null;
  streakFreezeCount: number;
}

export class StreakRepository {
  
  async getUserStreak(userId: number): Promise<StreakData | null> {
    const result = await db()
      .select({
        userId: usersTable.userId,
        currentStreak: usersTable.currentStreak,
        longestStreak: usersTable.longestStreak,
        lastStudyDate: usersTable.lastStudyDate,
        streakFreezeUsed: usersTable.streakFreezeUsed,
        streakFreezeCount: usersTable.streakFreezeCount,
      })
      .from(usersTable)
      .where(eq(usersTable.userId, userId))
      .limit(1);
    
    return result[0] || null;
  }

  async updateStreak(userId: number, data: Partial<StreakData>): Promise<StreakData> {
    const result = await db()
      .update(usersTable)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.userId, userId))
      .returning({
        userId: usersTable.userId,
        currentStreak: usersTable.currentStreak,
        longestStreak: usersTable.longestStreak,
        lastStudyDate: usersTable.lastStudyDate,
        streakFreezeUsed: usersTable.streakFreezeUsed,
        streakFreezeCount: usersTable.streakFreezeCount,
      });
    
    return result[0];
  }

  async initializeStreak(userId: number): Promise<StreakData> {
    const result = await db()
      .update(usersTable)
      .set({
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
        streakFreezeUsed: false,
        streakFreezeCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.userId, userId))
      .returning({
        userId: usersTable.userId,
        currentStreak: usersTable.currentStreak,
        longestStreak: usersTable.longestStreak,
        lastStudyDate: usersTable.lastStudyDate,
        streakFreezeUsed: usersTable.streakFreezeUsed,
        streakFreezeCount: usersTable.streakFreezeCount,
      });
    
    return result[0];
  }

  async incrementStreakFreeze(userId: number, amount: number = 1): Promise<void> {
    const user = await this.getUserStreak(userId);
    if (user) {
      await db()
        .update(usersTable)
        .set({
          streakFreezeCount: user.streakFreezeCount + amount,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.userId, userId));
    }
  }
}
