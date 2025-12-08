import { db } from '@/libs/drizzleClient.lib';
import { usersTable } from '@/models/user.model';
import { streakEventsTable } from '@/models/gamification/streak-events.model';
import { pointsTable, pointTransactionTable } from '@/models/gamification/points.model';
import { eq, and, sql, gte } from 'drizzle-orm';

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

  async updateStreak(userId: number, data: Partial<Omit<StreakData, 'userId'>>): Promise<StreakData> {
    const result = await db()
      .update(usersTable)
      .set({
        ...(data as object),
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
    await db()
      .update(usersTable)
      .set({
        streakFreezeCount: sql`${usersTable.streakFreezeCount} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.userId, userId));
  }

  /**
   * Check if a streak event already exists for a user on a specific date
   */
  async hasStreakEventToday(userId: number, eventDate: Date): Promise<boolean> {
    const startOfDay = new Date(eventDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(eventDate);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await db()
      .select({ id: streakEventsTable.id })
      .from(streakEventsTable)
      .where(
        and(
          eq(streakEventsTable.userId, userId),
          sql`${streakEventsTable.eventDate} >= ${startOfDay}`,
          sql`${streakEventsTable.eventDate} <= ${endOfDay}`
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Create a streak event record for idempotency
   */
  async createStreakEvent(
    userId: number, 
    eventDate: Date, 
    eventType: string, 
    pointsAwarded: number, 
    streakCount: number
  ): Promise<void> {
    await db().insert(streakEventsTable).values({
      userId,
      eventDate,
      eventType,
      pointsAwarded,
      streakCount,
      isProcessed: true,
    });
  }

  /**
   * Atomically purchase streak freeze with points spending
   */
  async atomicBuyStreakFreeze(
    userId: number,
    cost: number,
    freezeAmount: number = 1
  ): Promise<{
    success: boolean;
    streakFreezeCount: number;
    message: string;
  }> {
    return await db().transaction(async (tx) => {
      // First, spend points atomically with balance check
      const updatedPoints = await tx
        .update(pointsTable)
        .set({
          availablePoints: sql`${pointsTable.availablePoints} - ${cost}`,
          updatedAt: new Date(),
        })
        .where(and(eq(pointsTable.userId, userId), gte(pointsTable.availablePoints, cost)))
        .returning();

      if (updatedPoints.length === 0) {
        throw new Error('Insufficient points');
      }

      // Record points transaction
      await tx
        .insert(pointTransactionTable)
        .values({
          userId,
          points: -cost, // Negative for spending
          type: 'streak_freeze_purchase',
          description: 'Purchased streak freeze',
        });

      // Ensure streak record exists
      let streak = await tx
        .select({
          streakFreezeCount: usersTable.streakFreezeCount,
        })
        .from(usersTable)
        .where(eq(usersTable.userId, userId))
        .limit(1);

      if (streak.length === 0) {
        // Initialize streak record
        await tx
          .update(usersTable)
          .set({
            currentStreak: 0,
            longestStreak: 0,
            lastStudyDate: null,
            streakFreezeUsed: false,
            streakFreezeCount: 0,
            updatedAt: new Date(),
          })
          .where(eq(usersTable.userId, userId));
        
        streak = [{ streakFreezeCount: 0 }];
      }

      // Increment streak freeze count atomically
      const newFreezeCount = streak[0].streakFreezeCount + freezeAmount;
      
      await tx
        .update(usersTable)
        .set({
          streakFreezeCount: sql`${usersTable.streakFreezeCount} + ${freezeAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.userId, userId));

      return {
        success: true,
        streakFreezeCount: newFreezeCount,
        message: `Successfully purchased ${freezeAmount} streak freeze(s)`,
      };
    });
  }

  /**
   * Atomically update streak with proper locking and idempotency
   */
  async atomicStreakUpdate(
    userId: number,
    eventDate: Date,
    eventType: 'streak_continued' | 'streak_broken' | 'streak_restarted' | 'freeze_used',
    pointsAwarded: number,
    newStreakCount: number,
    useFreeze: boolean = false
  ): Promise<{
    success: boolean;
    currentStreak: number;
    longestStreak: number;
    streakFreezeCount: number;
    message: string;
  }> {
    return await db().transaction(async (tx) => {
      // Check if event already processed today
      const hasEvent = await tx
        .select({ id: streakEventsTable.id })
        .from(streakEventsTable)
        .where(
          and(
            eq(streakEventsTable.userId, userId),
            sql`${streakEventsTable.eventDate} >= ${eventDate}`,
            sql`${streakEventsTable.eventDate} < ${new Date(eventDate.getTime() + 24 * 60 * 60 * 1000)}`
          )
        )
        .limit(1);

      if (hasEvent.length > 0) {
        // Event already processed, return current state
        const currentStreak = await tx
          .select({
            currentStreak: usersTable.currentStreak,
            longestStreak: usersTable.longestStreak,
            streakFreezeCount: usersTable.streakFreezeCount,
          })
          .from(usersTable)
          .where(eq(usersTable.userId, userId))
          .limit(1);

        return {
          success: false,
          currentStreak: currentStreak[0]?.currentStreak || 0,
          longestStreak: currentStreak[0]?.longestStreak || 0,
          streakFreezeCount: currentStreak[0]?.streakFreezeCount || 0,
          message: 'Streak already updated today',
        };
      }

      // Get current streak data with row-level locking
      const currentStreak = await tx
        .select({
          currentStreak: usersTable.currentStreak,
          longestStreak: usersTable.longestStreak,
          lastStudyDate: usersTable.lastStudyDate,
          streakFreezeUsed: usersTable.streakFreezeUsed,
          streakFreezeCount: usersTable.streakFreezeCount,
        })
        .from(usersTable)
        .where(eq(usersTable.userId, userId))
        .for('update')
        .limit(1);

      if (currentStreak.length === 0) {
        throw new Error('User not found');
      }

      const streak = currentStreak[0];
      const newLongestStreak = Math.max(newStreakCount, streak.longestStreak);

      // Prepare update data
      const updateData: any = {
        currentStreak: newStreakCount,
        longestStreak: newLongestStreak,
        lastStudyDate: eventDate,
        updatedAt: new Date(),
      };

      if (useFreeze) {
        updateData.streakFreezeUsed = true;
        updateData.streakFreezeCount = Math.max(0, streak.streakFreezeCount - 1);
      } else {
        updateData.streakFreezeUsed = false;
      }

      // Update streak atomically
      const updatedStreak = await tx
        .update(usersTable)
        .set(updateData)
        .where(eq(usersTable.userId, userId))
        .returning({
          currentStreak: usersTable.currentStreak,
          longestStreak: usersTable.longestStreak,
          streakFreezeCount: usersTable.streakFreezeCount,
        });

      // Create streak event for idempotency
      await tx.insert(streakEventsTable).values({
        userId,
        eventDate,
        eventType,
        pointsAwarded,
        streakCount: newStreakCount,
        isProcessed: true,
      });

      return {
        success: true,
        currentStreak: updatedStreak[0].currentStreak,
        longestStreak: updatedStreak[0].longestStreak,
        streakFreezeCount: updatedStreak[0].streakFreezeCount,
        message: 'Streak updated successfully',
      };
    });
  }
}
