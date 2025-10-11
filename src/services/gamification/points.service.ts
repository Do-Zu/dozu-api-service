import { PointsRepository } from '@/repositories/gamification/points.repo';
import { Points, PointTransaction, POINT_RULES } from '@/models/gamification/points.model';

class PointsService {
  private pointsRepo: PointsRepository;

  constructor() {
    this.pointsRepo = new PointsRepository();
  }

  async awardPoints(userId: number, points: number, type: string, description: string, relatedId?: number, relatedType?: string): Promise<Points> {
    return await this.pointsRepo.awardPoints(userId, points, type, description, relatedId, relatedType);
  }

  async spendPoints(userId: number, points: number, type: string, description: string): Promise<Points> {
    return await this.pointsRepo.spendPoints(userId, points, type, description);
  }

  async getUserPoints(userId: number): Promise<Points | null> {
    return await this.pointsRepo.findByUserId(userId);
  }

  async getPointHistory(userId: number, limit: number = 50): Promise<PointTransaction[]> {
    return await this.pointsRepo.getTransactionHistory(userId, limit);
  }

  // Award points for different activities
  async awardLessonCompletion(userId: number, lessonId: number): Promise<void> {
    await this.awardPoints(
      userId,
      POINT_RULES.LESSON_COMPLETED,
      'lesson_completed',
      'Completed lesson',
      lessonId,
      'lesson'
    );
  }

  async awardQuizCompletion(userId: number, quizId: number, score: number): Promise<void> {
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

    await this.awardPoints(userId, points, 'quiz_completed', description, quizId, 'quiz');
  }

  async awardTopicCompletion(userId: number, topicId: number): Promise<void> {
    await this.awardPoints(
      userId,
      POINT_RULES.TOPIC_COMPLETED,
      'topic_completed',
      'Completed topic',
      topicId,
      'topic'
    );
  }

  async awardFlashcardReview(userId: number, flashcardId: number): Promise<void> {
    await this.awardPoints(
      userId,
      POINT_RULES.FLASHCARD_REVIEW,
      'flashcard_review',
      'Reviewed flashcard',
      flashcardId,
      'flashcard'
    );
  }

  async awardDailyGoal(userId: number): Promise<void> {
    await this.awardPoints(
      userId,
      POINT_RULES.DAILY_GOAL_REACHED,
      'daily_goal_reached',
      'Reached daily study goal'
    );
  }

  // Get point summary for user
  async getPointSummary(userId: number) {
    const userPoints = await this.getUserPoints(userId);
    const recentTransactions = await this.getPointHistory(userId, 10);

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

  // Check if user can afford something
  async canAfford(userId: number, cost: number): Promise<boolean> {
    const userPoints = await this.getUserPoints(userId);
    return userPoints ? userPoints.availablePoints >= cost : false;
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
