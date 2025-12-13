import { db } from '@/libs/drizzleClient.lib';
import { pointsTable, pointTransactionTable, Points, PointsInsert, PointTransaction, PointTransactionInsert } from '@/models/gamification/points.model';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

export class PointsRepository {
  
  async findByUserId(userId: number, classId: number): Promise<Points | null> {
    const result = await db()
      .select()
      .from(pointsTable)
      .where(and(eq(pointsTable.userId, userId), eq(pointsTable.classId, classId)))
      .limit(1);
    
    return result[0] || null;
  }

  async create(data: PointsInsert): Promise<Points> {
    const result = await db()
      .insert(pointsTable)
      .values(data)
      .returning();
    
    return result[0];
  }

  async update(userId: number, classId: number, data: Partial<PointsInsert>): Promise<Points> {
    const result = await db()
      .update(pointsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(pointsTable.userId, userId), eq(pointsTable.classId, classId)))
      .returning();
    
    return result[0];
  }

  async createTransaction(data: PointTransactionInsert): Promise<PointTransaction> {
    const result = await db()
      .insert(pointTransactionTable)
      .values(data)
      .returning();
    
    return result[0];
  }

  async getTransactionHistory(userId: number, classId: number, limit: number = 100): Promise<PointTransaction[]> {
    return await db()
      .select()
      .from(pointTransactionTable)
      .where(and(eq(pointTransactionTable.userId, userId), eq(pointTransactionTable.classId, classId)))
      .orderBy(desc(pointTransactionTable.createdAt))
      .limit(limit);
  }

  async spendPoints(userId: number, classId: number, points: number, type: string, description: string): Promise<Points> {
    if (!Number.isFinite(points) || !Number.isInteger(points) || points <= 0) {
      throw new Error('Invalid points: must be a positive integer');
    }
    // Atomic guarded decrement - prevents race conditions and ensures sufficient points
    const updatedRows = await db()
      .update(pointsTable)
      .set({
        availablePoints: sql`${pointsTable.availablePoints} - ${points}`,
        updatedAt: new Date(),
      })
      .where(and(
        eq(pointsTable.userId, userId),
        eq(pointsTable.classId, classId),
        gte(pointsTable.availablePoints, points)
      ))
      .returning();

    const updatedPoints = updatedRows[0];
    if (!updatedPoints) {
      throw new Error('Insufficient points');
    }

    // Record transaction
    await this.createTransaction({
      userId,
      classId,
      points: -points, // Negative for spending
      type,
      description,
    });

    return updatedPoints;
  }

  async awardPoints(userId: number, classId: number, points: number, type: string, description: string, relatedId?: number, relatedType?: string): Promise<Points> {
    // Use transaction to ensure atomicity of points update and transaction logging
    return await db().transaction(async (tx) => {
      // Get or create user points record for this class
      let userPoints = await tx
        .select()
        .from(pointsTable)
        .where(and(eq(pointsTable.userId, userId), eq(pointsTable.classId, classId)))
        .limit(1);

      if (!userPoints[0]) {
        // Create new points record
        const newPoints = await tx
          .insert(pointsTable)
          .values({
            userId,
            classId,
            totalPoints: points,
            availablePoints: points,
            lifetimePoints: points,
          })
          .returning();
        
        userPoints = newPoints;
      } else {
        // Update existing points atomically
        const updatedPoints = await tx
          .update(pointsTable)
          .set({
            totalPoints: sql`${pointsTable.totalPoints} + ${points}`,
            availablePoints: sql`${pointsTable.availablePoints} + ${points}`,
            lifetimePoints: sql`${pointsTable.lifetimePoints} + ${points}`,
            updatedAt: new Date(),
          })
          .where(and(eq(pointsTable.userId, userId), eq(pointsTable.classId, classId)))
          .returning();
        
        userPoints = updatedPoints;
      }

      // Record transaction within the same transaction
      await tx
        .insert(pointTransactionTable)
        .values({
          userId,
          classId,
          points,
          type,
          description,
          relatedId,
          relatedType,
        });

      return userPoints[0];
    });
  }
}
