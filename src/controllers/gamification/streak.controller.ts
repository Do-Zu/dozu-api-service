import { Request, Response } from 'express';
import streakService from '@/services/gamification/streak.service';
import { SuccessResponse } from '@/core/success';
import { BadRequest, DatabaseError } from '@/core/error';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';

export class StreakController {
  constructor() {}

  // GET /api/gamification/streak
  getUserStreak = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);

      const streak = await streakService.getUserStreak(userId);
      
      SuccessResponse.ok(res, streak, 'User streak retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to get user streak');
      }
    }
  };

  // GET /api/gamification/streak/stats
  getStreakStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);

      const stats = await streakService.getStreakStats(userId);
      
      SuccessResponse.ok(res, stats, 'Streak statistics retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to get streak statistics');
      }
    }
  };

  // POST /api/gamification/streak/update
  updateStreak = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);

      const result = await streakService.updateUserStreak(userId);
      
      SuccessResponse.ok(res, result, 'Streak updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to update streak');
      }
    }
  };

  // POST /api/gamification/streak/buy-freeze
  buyStreakFreeze = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);

      const { cost = 100 } = req.body;

      await streakService.buyStreakFreeze(userId, cost);
      
      SuccessResponse.ok(res, null, 'Streak freeze purchased successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Insufficient points') {
        throw new BadRequest('Insufficient points to buy streak freeze');
      } else if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to buy streak freeze');
      }
    }
  };

  // POST /api/gamification/streak/gift-freeze (Admin only)
  giftStreakFreeze = async (req: Request, res: Response): Promise<void> => {
    try {
      const { targetUserId, amount = 1 } = req.body;

      if (!targetUserId) {
        throw new BadRequest('Target user ID is required');
      }

      // TODO: Add admin role check here
      // if (req.currentUser?.role !== 'admin') {
      //   throw new BadRequest('Insufficient permissions');
      // }

      await streakService.giftStreakFreeze(parseInt(targetUserId), amount);
      
      SuccessResponse.ok(res, null, `Gifted ${amount} streak freeze(s) successfully`);
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      } else if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to gift streak freeze');
      }
    }
  };
}
