import { Request, Response } from 'express';
import pointsService from '@/services/gamification/points.service';
import streakService from '@/services/gamification/streak.service';
import { SuccessResponse } from '@/core/success';
import { BadRequest, DatabaseError, Forbidden } from '@/core/error';
import { getUserIdFromRequest, isTeacher } from '@/utils/auth/authHelpers.utils';

export class PointsController {
  constructor() {}

  // GET /api/gamification/points
  getUserPoints = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);

      const points = await pointsService.getUserPoints(userId);
      
      SuccessResponse.ok(res, points, 'User points retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to get user points');
      }
    }
  };

  // GET /api/gamification/points/user/:userId - For teachers to view student stats
  getUserGamificationStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check if the current user is a teacher
      const teacherCheck = await isTeacher(req);
      if (!teacherCheck) {
        throw new Forbidden('Only teachers can view other users\' gamification stats');
      }

      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        throw new BadRequest('Invalid user ID');
      }

      // Get points summary (includes available & lifetime)
      const summary = await pointsService.getPointSummary(userId);
      
      // Get streak data  
      const streak = await streakService.getUserStreak(userId);
      
      // Combine into gamification stats format
      const gamificationStats = {
        totalPoints: summary.availablePoints || 0,
        currentStreak: streak?.currentStreak || 0,
        longestStreak: streak?.longestStreak || 0,
        level: Math.floor((summary.lifetimePoints || 0) / 200) + 1, // Simple level calculation
        experiencePoints: (summary.lifetimePoints || 0) % 200,
        nextLevelExperience: 200,
        achievements: [], // TODO: Add achievements when implemented
        weeklyActivity: [0, 0, 0, 0, 0, 0, 0], // TODO: Get real weekly activity
        totalLessonsCompleted: 0, // TODO: Calculate from point transactions
        totalQuizzesCompleted: 0, // TODO: Calculate from point transactions
        totalFlashcardsReviewed: 0, // TODO: Calculate from point transactions
        averageScore: 85.0 // TODO: Calculate real average score
      };
      
      SuccessResponse.ok(res, { gamificationStats }, 'User gamification stats retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to get user gamification stats');
      }
    }
  };

  // GET /api/gamification/points/summary
  getPointSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);

      const summary = await pointsService.getPointSummary(userId);
      
      SuccessResponse.ok(res, summary, 'Point summary retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to get point summary');
      }
    }
  };

  // GET /api/gamification/points/history
  getPointHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);

      const limit = parseInt(req.query.limit as string) || 50;
      const history = await pointsService.getPointHistory(userId, limit);
      
      SuccessResponse.ok(res, history, 'Point history retrieved successfully');
    } catch (error) {
      if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to get point history');
      }
    }
  };

  // POST /api/gamification/points/spend
  spendPoints = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);

      const { points, type, description } = req.body;
      const spend = Number(points);
      if (!Number.isFinite(spend) || !Number.isInteger(spend) || spend <= 0) {
        throw new BadRequest('Field "points" must be a positive integer');
      }
      if (typeof type !== 'string' || !type.trim()) {
        throw new BadRequest('Field "type" must be a non-empty string');
      }
      if (typeof description !== 'string' || !description.trim()) {
        throw new BadRequest('Field "description" must be a non-empty string');
      }

      const result = await pointsService.spendPoints(userId, spend, type.trim(), description.trim());
      
      SuccessResponse.ok(res, result, 'Points spent successfully');
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      } else if (error instanceof Error && error.message === 'Insufficient points') {
        throw new BadRequest('Insufficient points');
      } else if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to spend points');
      }
    }
  };

  // POST /api/gamification/points/award/lesson
  awardLessonPoints = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);

      const { lessonId } = req.body;

      if (!lessonId) {
        throw new BadRequest('Lesson ID is required');
      }

      await pointsService.awardLessonCompletion(userId, parseInt(lessonId));
      
      SuccessResponse.ok(res, null, 'Lesson completion points awarded');
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      } else if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to award lesson points');
      }
    }
  };

  // POST /api/gamification/points/award/quiz
  awardQuizPoints = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);

      const { quizId, score } = req.body;

      if (!quizId || score === undefined) {
        throw new BadRequest('Quiz ID and score are required');
      }

      await pointsService.awardQuizCompletion(userId, parseInt(quizId), score);
      
      SuccessResponse.ok(res, null, 'Quiz completion points awarded');
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      } else if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to award quiz points');
      }
    }
  };

  // POST /api/gamification/points/award/topic
  awardTopicPoints = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);

      const { topicId } = req.body;

      if (!topicId) {
        throw new BadRequest('Topic ID is required');
      }

      await pointsService.awardTopicCompletion(userId, parseInt(topicId));
      
      SuccessResponse.ok(res, null, 'Topic completion points awarded');
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      } else if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to award topic points');
      }
    }
  };

  // POST /api/gamification/points/award/flashcard
  awardFlashcardPoints = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);

      const { flashcardId } = req.body;

      if (!flashcardId) {
        throw new BadRequest('Flashcard ID is required');
      }

      await pointsService.awardFlashcardReview(userId, parseInt(flashcardId));
      
      SuccessResponse.ok(res, null, 'Flashcard review points awarded');
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      } else if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to award flashcard points');
      }
    }
  };

  // POST /api/gamification/points/award/daily-goal
  awardDailyGoalPoints = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);

      await pointsService.awardDailyGoal(userId);
      
      SuccessResponse.ok(res, null, 'Daily goal points awarded');
    } catch (error) {
      if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to award daily goal points');
      }
    }
  };
}

export default new PointsController();
