import { StreakRepository, StreakData } from '@/repositories/gamification/streak.repo';
import pointsService from '@/services/gamification/points.service';
import { POINT_RULES, STREAK_BONUS } from '@/models/gamification/points.model';
import { 
  getStartOfDayInTimezone, 
  getYesterdayInTimezone, 
  isTodayInTimezone, 
  isYesterdayInTimezone,
  getUserTimezone 
} from '@/utils/date/streak-timezone';
import { SelectUser } from '@/models/user.model';
import ProfileRepository from '@/repositories/profile/profile.repo';

class StreakService {
  private streakRepo: StreakRepository;
  private profileRepo: ProfileRepository;

  constructor() {
    this.streakRepo = new StreakRepository();
    this.profileRepo = new ProfileRepository();
  }

  /**
   * Get user data including study preferences for timezone calculation
   */
  private async getUserData(userId: number): Promise<SelectUser | null> {
    return await this.profileRepo.getUserById(userId);
  }

  async updateUserStreak(userId: number): Promise<{
    currentStreak: number;
    isNewStreak: boolean;
    pointsEarned: number;
    streakBroken: boolean;
    message: string;
  }> {
    // Get user data to determine timezone
    const user = await this.getUserData(userId);
   
    // Get user's timezone from study preferences or default to UTC
    const userTimezone = getUserTimezone(user?.studyPreferences as any);
    
    // Calculate timezone-aware dates
    const today = getStartOfDayInTimezone(userTimezone);
    const yesterday = getYesterdayInTimezone(userTimezone);

    // Get current streak data
    let streak = await this.streakRepo.getUserStreak(userId);

    if (!streak) {
      // Initialize streak for new user
      streak = await this.streakRepo.initializeStreak(userId);
      
      // Use atomic update for first study session
      const result = await this.streakRepo.atomicStreakUpdate(
        userId,
        today,
        'streak_restarted',
        POINT_RULES.STREAK_MAINTAINED,
        1,
        false
      );

      if (result.success) {
        // Award points for first study session
        await pointsService.awardPoints(
          userId, 
          POINT_RULES.STREAK_MAINTAINED, 
          'first_study_session', 
          'Started your learning journey!'
        );

        return {
          currentStreak: result.currentStreak,
          isNewStreak: true,
          pointsEarned: POINT_RULES.STREAK_MAINTAINED,
          streakBroken: false,
          message: 'Started your learning streak! Keep it up!',
        };
      } else {
        // Already processed today
        return {
          currentStreak: result.currentStreak,
          isNewStreak: false,
          pointsEarned: 0,
          streakBroken: false,
          message: result.message,
        };
      }
    }

    const lastStudyDate = streak.lastStudyDate ? new Date(streak.lastStudyDate) : null;

    // Check if user already studied today (timezone-aware)
    if (lastStudyDate && isTodayInTimezone(lastStudyDate, userTimezone)) {
      return {
        currentStreak: streak.currentStreak,
        isNewStreak: false,
        pointsEarned: 0,
        streakBroken: false,
        message: 'You\'ve already studied today! Keep up the great work!',
      };
    }

    // Check if streak continues (studied yesterday - timezone-aware)
    if (lastStudyDate && isYesterdayInTimezone(lastStudyDate, userTimezone)) {
      // Continue streak
      const newCurrentStreak = streak.currentStreak + 1;
      
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

      // Use atomic update
      const result = await this.streakRepo.atomicStreakUpdate(
        userId,
        today,
        'streak_continued',
        pointsEarned,
        newCurrentStreak,
        false
      );

      if (result.success) {
        // Award points
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
          currentStreak: result.currentStreak,
          isNewStreak: false,
          pointsEarned,
          streakBroken: false,
          message,
        };
      } else {
        // Already processed today
        return {
          currentStreak: result.currentStreak,
          isNewStreak: false,
          pointsEarned: 0,
          streakBroken: false,
          message: result.message,
        };
      }
    }

    // Check for streak freeze
    if (streak.streakFreezeCount > 0 && !streak.streakFreezeUsed) {
      // Use freeze to bridge the missed day and continue the streak
      const newCurrentStreak = streak.currentStreak + 1;
      
      // Calculate points with bonuses (same as normal streak continuation)
      let pointsEarned = POINT_RULES.STREAK_MAINTAINED;
      if (newCurrentStreak % 7 === 0) {
        pointsEarned += STREAK_BONUS.WEEKLY_BONUS;
      }
      if (newCurrentStreak % 30 === 0) {
        pointsEarned += STREAK_BONUS.MONTHLY_BONUS;
      }

      // Use atomic update with freeze
      const result = await this.streakRepo.atomicStreakUpdate(
        userId,
        today,
        'freeze_used',
        pointsEarned,
        newCurrentStreak,
        true
      );

      if (result.success) {
        // Award points for maintaining streak with freeze
        await pointsService.awardPoints(
          userId, 
          pointsEarned, 
          'streak_maintained', 
          `Maintained ${newCurrentStreak}-day streak (freeze used)`
        );

        let message = `Streak freeze used! Your streak continues at ${newCurrentStreak} days!`;
        if (newCurrentStreak % 7 === 0) {
          message += ` 🎉 Weekly milestone reached!`;
        }
        if (newCurrentStreak % 30 === 0) {
          message += ` 🏆 Monthly milestone achieved!`;
        }

        return {
          currentStreak: result.currentStreak,
          isNewStreak: false,
          pointsEarned,
          streakBroken: false,
          message,
        };
      } else {
        // Already processed today
        return {
          currentStreak: result.currentStreak,
          isNewStreak: false,
          pointsEarned: 0,
          streakBroken: false,
          message: result.message,
        };
      }
    }

    // Streak broken - reset with atomic update
    const result = await this.streakRepo.atomicStreakUpdate(
      userId,
      today,
      'streak_broken',
      POINT_RULES.STREAK_MAINTAINED,
      1,
      false
    );

    if (result.success) {
      // Award points for restarting
      await pointsService.awardPoints(
        userId, 
        POINT_RULES.STREAK_MAINTAINED, 
        'streak_restarted', 
        'Restarted learning streak'
      );

      return {
        currentStreak: result.currentStreak,
        isNewStreak: true,
        pointsEarned: POINT_RULES.STREAK_MAINTAINED,
        streakBroken: true,
        message: `Streak broken but you're back! Starting fresh with day 1!`,
      };
    } else {
      // Already processed today
      return {
        currentStreak: result.currentStreak,
        isNewStreak: false,
        pointsEarned: 0,
        streakBroken: false,
        message: result.message,
      };
    }
  }

  async getUserStreak(userId: number): Promise<StreakData | null> {
    return await this.streakRepo.getUserStreak(userId);
  }

  async buyStreakFreeze(userId: number, cost: number = 100): Promise<void> {
    await pointsService.spendPoints(userId, cost, 'streak_freeze_purchase', 'Purchased streak freeze');
    await this.streakRepo.atomicBuyStreakFreeze(userId, cost, 1);
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
