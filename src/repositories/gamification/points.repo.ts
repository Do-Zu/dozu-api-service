import { db } from '@/libs/drizzleClient.lib';
import { pointsTable, pointTransactionTable, Points, PointsInsert, PointTransaction, PointTransactionInsert } from '@/models/gamification/points.model';
import { eq, desc } from 'drizzle-orm';

export class PointsRepository {
  
  async findByUserId(userId: number): Promise<Points | null> {
    const result = await db()
      .select()
      .from(pointsTable)
      .where(eq(pointsTable.userId, userId))
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

  async update(userId: number, data: Partial<PointsInsert>): Promise<Points> {
    const result = await db()
      .update(pointsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pointsTable.userId, userId))
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

  async getTransactionHistory(userId: number, limit: number = 50): Promise<PointTransaction[]> {
    return await db()
      .select()
      .from(pointTransactionTable)
      .where(eq(pointTransactionTable.userId, userId))
      .orderBy(desc(pointTransactionTable.createdAt))
      .limit(limit);
  }

  async spendPoints(userId: number, points: number, type: string, description: string): Promise<Points> {
    // First check if user has enough points
    const userPoints = await this.findByUserId(userId);
    if (!userPoints || userPoints.availablePoints < points) {
      throw new Error('Insufficient points');
    }

    // Update points
    const updatedPoints = await this.update(userId, {
      availablePoints: userPoints.availablePoints - points,
    });

    // Record transaction
    await this.createTransaction({
      userId,
      points: -points, // Negative for spending
      type,
      description,
    });

    return updatedPoints;
  }

  async awardPoints(userId: number, points: number, type: string, description: string, relatedId?: number, relatedType?: string): Promise<Points> {
    // Get or create user points record
    let userPoints = await this.findByUserId(userId);

    if (!userPoints) {
      // Create new points record
      userPoints = await this.create({
        userId,
        totalPoints: points,
        availablePoints: points,
        lifetimePoints: points,
      });
    } else {
      // Update existing points
      userPoints = await this.update(userId, {
        totalPoints: userPoints.totalPoints + points,
        availablePoints: userPoints.availablePoints + points,
        lifetimePoints: userPoints.lifetimePoints + points,
      });
    }

    // Record transaction
    await this.createTransaction({
      userId,
      points,
      type,
      description,
      relatedId,
      relatedType,
    });

    return userPoints;
  }
}
