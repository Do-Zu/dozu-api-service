import { StreakRepository, StreakData } from '@/repositories/gamification/streak.repo';
import pointsService from '@/services/gamification/points.service';
import { POINT_RULES, STREAK_BONUS } from '@/models/gamification/points.model';

class StreakService {
  private streakRepo: StreakRepository;

  constructor() {
    this.streakRepo = new StreakRepository();
  }

  async updateUserStreak(userId: number): Promise<{
    currentStreak: number;
    isNewStreak: boolean;
    pointsEarned: number;
    streakBroken: boolean;
    message: string;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get current streak data
    let streak = await this.streakRepo.getUserStreak(userId);

    if (!streak) {
      // Initialize streak for new user
      streak = await this.streakRepo.initializeStreak(userId);
      
      // Award points for first study session
      const pointsEarned = POINT_RULES.STREAK_MAINTAINED;
      await pointsService.awardPoints(
        userId, 
        pointsEarned, 
        'first_study_session', 
        'Started your learning journey!'
      );

      // Update streak to 1
      const updatedStreak = await this.streakRepo.updateStreak(userId, {
        currentStreak: 1,
        longestStreak: 1,
        lastStudyDate: today,
      });

      return {
        currentStreak: updatedStreak.currentStreak,
        isNewStreak: true,
        pointsEarned,
        streakBroken: false,
        message: 'Started your learning streak! Keep it up!',
      };
    }

    const lastStudyDate = streak.lastStudyDate ? new Date(streak.lastStudyDate) : null;
    if (lastStudyDate) {
      lastStudyDate.setHours(0, 0, 0, 0);
    }

    // Check if user already studied today
    if (lastStudyDate && lastStudyDate.getTime() === today.getTime()) {
      return {
        currentStreak: streak.currentStreak,
        isNewStreak: false,
        pointsEarned: 0,
        streakBroken: false,
        message: 'You\'ve already studied today! Keep up the great work!',
      };
    }

    // Check if streak continues (studied yesterday)
    if (lastStudyDate && lastStudyDate.getTime() === yesterday.getTime()) {
      // Continue streak
      const newCurrentStreak = streak.currentStreak + 1;
      const newLongestStreak = Math.max(newCurrentStreak, streak.longestStreak);

      await this.streakRepo.updateStreak(userId, {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastStudyDate: today,
        streakFreezeUsed: false, // Reset freeze for new day
      });

      // Calculate points with bonuses
      let pointsEarned = POINT_RULES.STREAK_MAINTAINED;
      
      // Weekly bonus
      if (newCurrentStreak % 7 === 0) {
        pointsEarned += STREAK_BONUS.WEEKLY_BONUS;
      }
      
      // Monthly bonus
      if (newCurrentStreak % 30 === 0) {
        pointsEarned += STREAK_BONUS.MONTHLY_BONUS;
      }
      
      await pointsService.awardPoints(
        userId, 
        pointsEarned, 
        'streak_maintained', 
        `Maintained ${newCurrentStreak}-day streak!`
      );

      let message = `Streak continued! ${newCurrentStreak} days strong!`;
      if (newCurrentStreak % 7 === 0) {
        message += ` 🎉 Weekly milestone reached!`;
      }
      if (newCurrentStreak % 30 === 0) {
        message += ` 🏆 Monthly milestone achieved!`;
      }

      return {
        currentStreak: newCurrentStreak,
        isNewStreak: false,
        pointsEarned,
        streakBroken: false,
        message,
      };
    }

    // Check for streak freeze
    if (streak.streakFreezeCount > 0 && !streak.streakFreezeUsed) {
      // Use streak freeze
      await this.streakRepo.updateStreak(userId, {
        lastStudyDate: today,
        streakFreezeUsed: true,
        streakFreezeCount: streak.streakFreezeCount - 1,
      });

      return {
        currentStreak: streak.currentStreak,
        isNewStreak: false,
        pointsEarned: 0,
        streakBroken: false,
        message: `Streak freeze used! Your ${streak.currentStreak}-day streak is safe!`,
      };
    }

    // Streak broken - reset
    await this.streakRepo.updateStreak(userId, {
      currentStreak: 1,
      lastStudyDate: today,
      streakFreezeUsed: false,
    });

    // Award points for restarting
    const pointsEarned = POINT_RULES.STREAK_MAINTAINED;
    await pointsService.awardPoints(
      userId, 
      pointsEarned, 
      'streak_restarted', 
      'Restarted learning streak'
    );

    return {
      currentStreak: 1,
      isNewStreak: true,
      pointsEarned,
      streakBroken: true,
      message: `Streak broken but you're back! Starting fresh with day 1!`,
    };
  }

  async getUserStreak(userId: number): Promise<StreakData | null> {
    return await this.streakRepo.getUserStreak(userId);
  }

  async buyStreakFreeze(userId: number, cost: number = 100): Promise<void> {
    // Spend points to buy streak freeze
    await pointsService.spendPoints(userId, cost, 'streak_freeze_purchase', 'Purchased streak freeze');
    await this.streakRepo.incrementStreakFreeze(userId, 1);
  }

  async giftStreakFreeze(userId: number, amount: number = 1): Promise<void> {
    await this.streakRepo.incrementStreakFreeze(userId, amount);
  }

  // Get streak statistics
  async getStreakStats(userId: number) {
    const streak = await this.getUserStreak(userId);
    if (!streak) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        streakFreezeCount: 0,
        lastStudyDate: null,
        daysUntilNextMilestone: 7,
        nextMilestone: 7,
      };
    }

    // Calculate next milestone
    const nextWeeklyMilestone = Math.ceil((streak.currentStreak + 1) / 7) * 7;
    const daysUntilNextMilestone = nextWeeklyMilestone - streak.currentStreak;

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      streakFreezeCount: streak.streakFreezeCount,
      lastStudyDate: streak.lastStudyDate,
      daysUntilNextMilestone,
      nextMilestone: nextWeeklyMilestone,
    };
  }
}

export default new StreakService();
