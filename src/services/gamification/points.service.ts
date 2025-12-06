import { PointsRepository } from '@/repositories/gamification/points.repo';
import { Points, PointTransaction, POINT_RULES } from '@/models/gamification/points.model';
import { progressRepository } from '@/repositories/progress/progress.repo';
import topicRepo from '@/repositories/topic.repo';
import { ContentType, ProgressStatus, IProgress } from '@/types/progress/progress.type';

class PointsService {
  private pointsRepo: PointsRepository;

  constructor() {
    this.pointsRepo = new PointsRepository();
  }

  async awardPoints(userId: number, classId: number, points: number, type: string, description: string, relatedId?: number, relatedType?: string): Promise<Points> {
    return await this.pointsRepo.awardPoints(userId, classId, points, type, description, relatedId, relatedType);
  }

  async spendPoints(userId: number, classId: number, points: number, type: string, description: string): Promise<Points> {
    return await this.pointsRepo.spendPoints(userId, classId, points, type, description);
  }

  async getUserPoints(userId: number, classId: number): Promise<Points | null> {
    return await this.pointsRepo.findByUserId(userId, classId);
  }

  async getPointHistory(userId: number, classId: number, limit: number = 50): Promise<PointTransaction[]> {
    return await this.pointsRepo.getTransactionHistory(userId, classId, limit);
  }

  // Award points for different activities
  async awardLessonCompletion(userId: number, classId: number, lessonId: number): Promise<void> {
    await this.awardPoints(
      userId,
      classId,
      POINT_RULES.LESSON_COMPLETED,
      'lesson_completed',
      'Completed lesson',
      lessonId,
      'lesson'
    );
  }

  async awardQuizCompletion(userId: number, classId: number, quizId: number, score: number): Promise<void> {
    let points = 0;
    let description = '';

    if (score === 100) {
      points = POINT_RULES.QUIZ_PERFECT_SCORE;
      description = `Perfect quiz score (100%)`;
    } else if (score >= 80) {
      points = POINT_RULES.QUIZ_HIGH_SCORE;
      description = `High quiz score (${score}%)`;
    } else {
      points = Math.max(POINT_RULES.QUIZ_COMPLETED, Math.floor(score / 10)); // Minimum 5 points or 1 point per 10%
      description = `Quiz completed (${score}%)`;
    }

    await this.awardPoints(userId, classId, points, 'quiz_completed', description, quizId, 'quiz');
  }

  async awardTopicCompletion(userId: number, classId: number, topicId: number): Promise<void> {
    await this.awardPoints(
      userId,
      classId,
      POINT_RULES.TOPIC_COMPLETED,
      'topic_completed',
      'Completed topic',
      topicId,
      'topic'
    );
  }

  async awardFlashcardReview(userId: number, classId: number, flashcardId: number): Promise<void> {
    await this.awardPoints(
      userId,
      classId,
      POINT_RULES.FLASHCARD_REVIEW,
      'flashcard_review',
      'Reviewed flashcard',
      flashcardId,
      'flashcard'
    );
  }

  async awardDailyGoal(userId: number, classId: number): Promise<void> {
    await this.awardPoints(
      userId,
      classId,
      POINT_RULES.DAILY_GOAL_REACHED,
      'daily_goal_reached',
      'Reached daily study goal'
    );
  }

  // Get point summary for user in a class
  async getPointSummary(userId: number, classId: number) {
    const userPoints = await this.getUserPoints(userId, classId);
    const recentTransactions = await this.getPointHistory(userId, classId, 10);

    if (!userPoints) {
      return {
        totalPoints: 0,
        availablePoints: 0,
        lifetimePoints: 0,
        recentTransactions: [],
        rank: 'Beginner',
      };
    }

    // Determine user rank based on lifetime points
    let rank = 'Beginner';
    if (userPoints.lifetimePoints >= 10000) rank = 'Master';
    else if (userPoints.lifetimePoints >= 5000) rank = 'Expert';
    else if (userPoints.lifetimePoints >= 2000) rank = 'Advanced';
    else if (userPoints.lifetimePoints >= 500) rank = 'Intermediate';

    return {
      totalPoints: userPoints.totalPoints,
      availablePoints: userPoints.availablePoints,
      lifetimePoints: userPoints.lifetimePoints,
      recentTransactions,
      rank,
    };
  }

  // Check if user can afford something in a class
  async canAfford(userId: number, classId: number, cost: number): Promise<boolean> {
    const userPoints = await this.getUserPoints(userId, classId);
    return userPoints ? userPoints.availablePoints >= cost : false;
  }

  // Calculate learning statistics from point transactions and progress records for a specific class
  async calculateLearningStatistics(userId: number, classId: number): Promise<{
    totalLessonsCompleted: number;
    totalQuizzesCompleted: number;
    totalFlashcardsCompleted: number;
    averageScore: number;
  }> {
    try {
      // Get all point transactions for this user in this class
      const transactions = await this.getPointHistory(userId, classId, 1000);
      
      // Get all topics in this class
      const topics = await topicRepo.getTopicsInClassForTeacher(classId);
      const topicIds = topics.map(t => t.topicId);

      // Get all progress records for this user
      const allProgress = await progressRepository.findAllProgress({ userId });
      
      // Filter progress by topics in this class
      const classProgress = allProgress.filter(p => topicIds.includes(p.topicId));

      let totalLessonsCompleted = 0;
      let totalQuizzesCompleted = 0;
      let totalFlashcardsCompleted = 0;
      let totalQuizScore = 0;
      let quizCount = 0;

      // Use Set to track unique quizzes to avoid duplicates
      const completedQuizzes = new Set<number>();
      const completedLessons = new Set<number>();

      // Group progress by topicId
      const progressByTopic = new Map<number, IProgress[]>();
      for (const progress of classProgress) {
        if (!progressByTopic.has(progress.topicId)) {
          progressByTopic.set(progress.topicId, []);
        }
        progressByTopic.get(progress.topicId)!.push(progress);
      }

      // Calculate lesson completion based on flashcard and quiz completion
      for (const [topicId, topicProgress] of progressByTopic) {
        const flashcards = topicProgress.filter(p => p.contentType === ContentType.FLASHCARD);
        const quizzes = topicProgress.filter(p => p.contentType === ContentType.QUIZ);
        
        const hasFlashcards = flashcards.length > 0;
        const hasQuizzes = quizzes.length > 0;
        
        const completedFlashcards = flashcards.filter(p => p.status === ProgressStatus.COMPLETED);
        const completedQuizzesForTopic = quizzes.filter(p => p.status === ProgressStatus.COMPLETED);
        
        const allFlashcardsCompleted = hasFlashcards && completedFlashcards.length === flashcards.length;
        const allQuizzesCompleted = hasQuizzes && completedQuizzesForTopic.length === quizzes.length;

        // Lesson completion logic:
        // 1. If has both flashcard and quiz: need both completed
        // 2. If only has flashcard: need flashcard completed
        // 3. If only has quiz: need quiz completed
        if (hasFlashcards && hasQuizzes) {
          // Case 1: Has both - need both completed
          if (allFlashcardsCompleted && allQuizzesCompleted) {
            if (!completedLessons.has(topicId)) {
              completedLessons.add(topicId);
              totalLessonsCompleted++;
            }
          }
        } else if (hasFlashcards && !hasQuizzes) {
          // Case 2: Only flashcard - need flashcard completed
          if (allFlashcardsCompleted) {
            if (!completedLessons.has(topicId)) {
              completedLessons.add(topicId);
              totalLessonsCompleted++;
            }
          }
        } else if (!hasFlashcards && hasQuizzes) {
          // Case 3: Only quiz - need quiz completed
          if (allQuizzesCompleted) {
            if (!completedLessons.has(topicId)) {
              completedLessons.add(topicId);
              totalLessonsCompleted++;
            }
          }
        }
      }

      // Count quizzes and flashcards from transactions
      for (const transaction of transactions) {
        switch (transaction.type) {
          case 'quiz_completed':
            if (transaction.points >= POINT_RULES.QUIZ_COMPLETED && transaction.relatedId) {
              // Only count unique quizzes
              if (!completedQuizzes.has(transaction.relatedId)) {
                completedQuizzes.add(transaction.relatedId);
                totalQuizzesCompleted++;
                
                // Estimate score based on points awarded
                let estimatedScore = 60;
                if (transaction.points >= POINT_RULES.QUIZ_PERFECT_SCORE) {
                  estimatedScore = 100;
                } else if (transaction.points >= POINT_RULES.QUIZ_HIGH_SCORE) {
                  estimatedScore = 90;
                } else if (transaction.points > POINT_RULES.QUIZ_COMPLETED) {
                  const progress = (transaction.points - POINT_RULES.QUIZ_COMPLETED) / 
                                  (POINT_RULES.QUIZ_HIGH_SCORE - POINT_RULES.QUIZ_COMPLETED);
                  estimatedScore = Math.min(90, 60 + (progress * 30));
                }
                
                totalQuizScore += estimatedScore;
                quizCount++;
              }
            }
            break;
            
          case 'flashcard_review':
            if (transaction.points === POINT_RULES.FLASHCARD_REVIEW) {
              // Count each flashcard review (not unique, as user can review same flashcard multiple times)
              totalFlashcardsCompleted++;
            }
            break;
        }
      }

      const averageScore = quizCount > 0 ? totalQuizScore / quizCount : 0;

      return {
        totalLessonsCompleted,
        totalQuizzesCompleted,
        totalFlashcardsCompleted,
        averageScore: Math.round(averageScore * 10) / 10 // Round to 1 decimal place
      };
    } catch (error) {
      console.error('Failed to calculate learning statistics from point transactions:', error);
      return {
        totalLessonsCompleted: 0,
        totalQuizzesCompleted: 0,
        totalFlashcardsCompleted: 0,
        averageScore: 0
      };
    }
  }

  // Get leaderboard (top users by lifetime points)
//   async getLeaderboard(_limit: number = 10) {
//     // This would require a more complex query joining users and points tables
//     // For now, returning empty array - would need to implement in repository
//     // TODO: Implement actual leaderboard query with _limit parameter
//     return [];
//   }
}

export default new PointsService();
