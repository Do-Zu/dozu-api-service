import { Request, Response } from 'express';
import pointsService from '@/services/gamification/points.service';
import streakService from '@/services/gamification/streak.service';
import { progressService } from '@/services/progress/progress.service';
import topicRepo from '@/repositories/topic.repo';
import { SuccessResponse } from '@/core/success';
import { BadRequest, DatabaseError, Forbidden } from '@/core/error';
import { getUserIdFromRequest, isTeacher } from '@/utils/auth/authHelpers.utils';
import { ContentType, ProgressStatus } from '@/types/progress/progress.type';

export class PointsController {
  constructor() {}

  // GET /api/gamification/points?classId=xxx
  getUserPoints = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);
      const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;

      if (!classId || isNaN(classId)) {
        throw new BadRequest('classId query parameter is required and must be a valid number');
      }

      const points = await pointsService.getUserPoints(userId, classId);
      
      SuccessResponse.ok(res, points, 'User points retrieved successfully');
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      } else if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to get user points');
      }
    }
  };

  // GET /api/gamification/points/user/:userId - For teachers to view student stats, or users to view their own stats
  getUserGamificationStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUserId = getUserIdFromRequest(req);
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        throw new BadRequest('Invalid user ID');
      }

      // Allow users to view their own stats, or teachers to view any user's stats
      const isViewingOwnStats = currentUserId === userId;
      const teacherCheck = await isTeacher(req);
      
      if (!isViewingOwnStats && !teacherCheck) {
        throw new Forbidden('Only teachers can view other users\' gamification stats');
      }

      // Get points summary (includes available & lifetime)
      const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;
      if (!classId || isNaN(classId)) {
        throw new BadRequest('classId query parameter is required and must be a valid number');
      }
      const summary = await pointsService.getPointSummary(userId, classId);
      
      // Get streak data for this specific class
      // If streak doesn't exist, initialize it
      let streak = await streakService.getClassStreak(userId, classId);
      if (!streak) {
        streak = await streakService.initializeClassStreak(userId, classId);
      }
      
      // If streak is 0, try to recalculate from progress
      // This ensures streak is calculated from existing progress data
      if (streak && streak.currentStreak === 0) {
        try {
          // Try to update streak from progress (this will calculate streak from progress history)
          // This is a "silent" update - it won't award points if streak was already calculated
          await streakService.updateUserStreak(userId, classId);
          // Fetch updated streak
          streak = await streakService.getClassStreak(userId, classId) || streak;
        } catch (error) {
          // If update fails (e.g., no progress data), just use the initialized streak
          console.error('Failed to recalculate streak from progress:', error);
        }
      }
      
      // Calculate learning statistics from point transactions for this class
      const learningStats = await pointsService.calculateLearningStatistics(userId, classId);
      
      // Combine into gamification stats format
      const gamificationStats = {
        totalPoints: summary.totalPoints || 0,
        currentStreak: streak?.currentStreak || 0,
        longestStreak: streak?.longestStreak || 0,
        level: Math.floor((summary.lifetimePoints || 0) / 200) + 1, // Simple level calculation
        experiencePoints: (summary.lifetimePoints || 0) % 200,
        nextLevelExperience: 200,
        achievements: [], // TODO: Add achievements when implemented
        weeklyActivity: [0, 0, 0, 0, 0, 0, 0], // TODO: Get real weekly activity
        totalLessonsCompleted: learningStats.totalLessonsCompleted,
        totalQuizzesCompleted: learningStats.totalQuizzesCompleted,
        totalFlashcardsCompleted: learningStats.totalFlashcardsCompleted,
        averageScore: learningStats.averageScore
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

  // GET /api/gamification/points/summary?classId=xxx
  getPointSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);
      const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;

      if (!classId || isNaN(classId)) {
        throw new BadRequest('classId query parameter is required and must be a valid number');
      }

      const summary = await pointsService.getPointSummary(userId, classId);
      
      SuccessResponse.ok(res, summary, 'Point summary retrieved successfully');
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      } else if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to get point summary');
      }
    }
  };

  // GET /api/gamification/points/history?classId=xxx
  getPointHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserIdFromRequest(req);
      const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;

      if (!classId || isNaN(classId)) {
        throw new BadRequest('classId query parameter is required and must be a valid number');
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const history = await pointsService.getPointHistory(userId, classId, limit);
      
      SuccessResponse.ok(res, history, 'Point history retrieved successfully');
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      } else if (error instanceof Error) {
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
      const { classId, points, type, description } = req.body;

      if (!classId || typeof classId !== 'number') {
        throw new BadRequest('classId is required and must be a number');
      }

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

      const result = await pointsService.spendPoints(userId, classId, spend, type.trim(), description.trim());
      
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
      const { lessonId, classId } = req.body;

      if (!lessonId) {
        throw new BadRequest('Lesson ID is required');
      }
      if (!classId || typeof classId !== 'number') {
        throw new BadRequest('classId is required and must be a number');
      }

      const topicId = parseInt(lessonId);
      
      // Validate that the topic/lesson exists and belongs to the class
      const topic = await topicRepo.getTopicById(topicId);
      if (!topic) {
        throw new BadRequest('Lesson not found');
      }
      if (topic.classId !== classId) {
        throw new BadRequest('Lesson does not belong to the specified class');
      }

      // Check if lesson is already completed in progress
      const progressRecords = await progressService.getAllProgress({
        userId,
        topicId,
        contentType: ContentType.TOPIC
      });
      
      const completedProgress = progressRecords.find(
        p => p.status === ProgressStatus.COMPLETED
      );

      if (!completedProgress) {
        throw new BadRequest('Lesson must be completed before points can be awarded');
      }

      // Check if points were already awarded for this lesson
      const pointHistory = await pointsService.getPointHistory(userId, classId, 100);
      const alreadyAwarded = pointHistory.some(
        transaction => 
          transaction.type === 'lesson_completed' && 
          transaction.relatedId === topicId &&
          transaction.relatedType === 'lesson'
      );

      if (alreadyAwarded) {
        throw new BadRequest('Points for this lesson have already been awarded');
      }

      await pointsService.awardLessonCompletion(userId, classId, topicId);
      
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
      const { quizId, score, classId } = req.body;

      if (!quizId || score === undefined) {
        throw new BadRequest('Quiz ID and score are required');
      }
      if (!classId || typeof classId !== 'number') {
        throw new BadRequest('classId is required and must be a number');
      }

      await pointsService.awardQuizCompletion(userId, classId, parseInt(quizId), score);
      
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
      const { topicId, classId } = req.body;

      if (!topicId) {
        throw new BadRequest('Topic ID is required');
      }
      if (!classId || typeof classId !== 'number') {
        throw new BadRequest('classId is required and must be a number');
      }

      await pointsService.awardTopicCompletion(userId, classId, parseInt(topicId));
      
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
      const { flashcardId, classId } = req.body;

      if (!flashcardId) {
        throw new BadRequest('Flashcard ID is required');
      }
      if (!classId || typeof classId !== 'number') {
        throw new BadRequest('classId is required and must be a number');
      }

      await pointsService.awardFlashcardReview(userId, classId, parseInt(flashcardId));
      
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
      const { classId } = req.body;

      if (!classId || typeof classId !== 'number') {
        throw new BadRequest('classId is required and must be a number');
      }

      await pointsService.awardDailyGoal(userId, classId);
      
      SuccessResponse.ok(res, null, 'Daily goal points awarded');
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      } else if (error instanceof Error) {
        throw new DatabaseError(error.message);
      } else {
        throw new DatabaseError('Failed to award daily goal points');
      }
    }
  };
}

export default new PointsController();
