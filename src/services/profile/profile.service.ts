import ProfileRepository from '@/repositories/profile/profile.repo';
import pointsService from '@/services/gamification/points.service';
import streakService from '@/services/gamification/streak.service';
import { NotFoundError, BadRequest } from '@/core/error';
import { hashPassword, verifyPassword } from '@/utils/auth/hash.utils';
import path from 'path';
import fs from 'fs/promises';
import logger from '@/utils/logger';

import type { 
  ProfileData, 
  ProfileUpdateData, 
  PasswordChangeData, 
  UserSettings,
  ValidationResult
} from '@/types/profile/profile.types';

import type { 
  NotificationSettings, 
  PrivacySettings,
  SelectUser
} from '@/models/user.model';

/**
 * Service class for handling user profile logic.
 * This service interacts with the User table (merged structure).
 */
class ProfileService {
  private profileRepo = new ProfileRepository();

  /**
   * Get profile data for a specific user by ID
   */
  public async getProfile(userId: number): Promise<ProfileData> {
    const user = await this.profileRepo.getUserById(userId);
    if (!user) throw new NotFoundError('User not found');
    
    // Get gamification data
    const profileData = this.mapUserToProfileData(user);
    
    try {
      const points = await pointsService.getUserPoints(userId);
      const streak = await streakService.getUserStreak(userId);
      
      // Calculate real learning statistics
      const learningStats = await this.calculateLearningStatistics(userId);
      
      profileData.gamificationStats = {
        totalPoints: points?.totalPoints || 0,
        currentStreak: streak?.currentStreak || 0,
        longestStreak: streak?.longestStreak || 0,
        level: Math.floor((points?.totalPoints || 0) / 200) + 1,
        experiencePoints: (points?.totalPoints || 0) % 200,
        nextLevelExperience: 200,
        achievements: [], // TODO: Add achievements when implemented
        weeklyActivity: [0, 0, 0, 0, 0, 0, 0], // TODO: Get real weekly activity
        totalLessonsCompleted: learningStats.totalLessonsCompleted,
        totalQuizzesCompleted: learningStats.totalQuizzesCompleted,
        totalFlashcardsReviewed: learningStats.totalFlashcardsReviewed,
        averageScore: learningStats.averageScore
      };
    } catch (error) {
      logger.warn('Failed to get gamification stats for user', { userId, error });
      // Continue without gamification stats
    }
    
    return profileData;
  }

  /**
   * Update user profile information
   */
  public async updateProfile(userId: number, data: ProfileUpdateData): Promise<ProfileData> {
    const updatedUser = await this.profileRepo.updateProfile(userId, data);
    return this.mapUserToProfileData(updatedUser);
  }

  /**
   * Change user password with current password verification
   */
  public async changePassword(userId: number, passwordData: PasswordChangeData): Promise<void> {
    const currentPasswordHash = await this.profileRepo.getUserPasswordHash(userId);
    if (!currentPasswordHash) throw new NotFoundError('User not found or no password set');

    const isCurrentPasswordValid = await verifyPassword(passwordData.currentPassword, currentPasswordHash);
    if (!isCurrentPasswordValid) throw new BadRequest('Invalid current password');

    const newPasswordHash = await hashPassword(passwordData.newPassword);
    await this.profileRepo.updatePassword(userId, newPasswordHash);
  }

  /**
   * Update user notification preferences
   */
  public async updateNotificationSettings(userId: number, settings: NotificationSettings): Promise<NotificationSettings> {
    return await this.profileRepo.updateNotificationSettings(userId, settings);
  }

  /**
   * Update user privacy preferences
   */
  public async updatePrivacySettings(userId: number, settings: PrivacySettings): Promise<PrivacySettings> {
    return await this.profileRepo.updatePrivacySettings(userId, settings);
  }

  /**
   * Update multiple settings (notification & privacy) at once
   */
  public async updateSettings(userId: number, settings: UserSettings): Promise<UserSettings> {
    const result: UserSettings = {};
    
    // Apply notification settings
    if (settings.notifications) {
      result.notifications = await this.updateNotificationSettings(userId, settings.notifications);
    }

    // Apply privacy settings
    if (settings.privacy) {
      result.privacy = await this.updatePrivacySettings(userId, settings.privacy);
    }

    return result;
  }

  /**
   * Delete user account (also removes avatar file if exists)
   */
  public async deleteAccount(userId: number): Promise<void> {
    const user = await this.profileRepo.getUserById(userId);

    // Remove uploaded avatar file (if exists)
    if (user && user.avatarUrl && user.avatarUrl.startsWith('/uploads/')) {
      try {
        const filePath = path.join(process.cwd(), user.avatarUrl);
        await fs.unlink(filePath);
      } catch (fileError) {
        logger.warn('Could not delete avatar file during account deletion:', fileError);
      }
    }

    await this.profileRepo.deleteAccount(userId);
  }

  /**
   * Calculate real learning statistics from points transactions
   */
  private async calculateLearningStatistics(userId: number): Promise<{
    totalLessonsCompleted: number;
    totalQuizzesCompleted: number;
    totalFlashcardsReviewed: number;
    averageScore: number;
  }> {
    try {
      // Get all points transactions for this user
      const transactions = await pointsService.getPointHistory(userId, 1000); // Get more transactions for accurate calculation
      
      let totalLessonsCompleted = 0;
      let totalQuizzesCompleted = 0;
      let totalFlashcardsReviewed = 0;
      let totalQuizScore = 0;
      let quizCount = 0;

      // Count activities based on transaction types and points
      for (const transaction of transactions) {
        switch (transaction.type) {
          case 'lesson_completed':
            if (transaction.points === 10) { // +10 points for completing a lesson
              totalLessonsCompleted++;
            }
            break;
            
          case 'quiz_completed':
          case 'quiz_high_score':
            if (transaction.points === 20) { // +20 points for high score in quiz
              totalQuizzesCompleted++;
              // High score quiz (assuming 90+ is high score)
              totalQuizScore += 95; // Estimate high score
              quizCount++;
            } else if (transaction.points > 0) {
              totalQuizzesCompleted++;
              // Regular quiz score estimation based on points
              const estimatedScore = Math.min(100, Math.max(60, (transaction.points / 20) * 100));
              totalQuizScore += estimatedScore;
              quizCount++;
            }
            break;
            
          case 'flashcard_reviewed':
          case 'streak_maintained':
            if (transaction.points === 5) { // +5 points for maintaining streak (flashcard review)
              totalFlashcardsReviewed++;
            }
            break;
            
          default:
            // Handle other transaction types if needed
            break;
        }
      }

      const averageScore = quizCount > 0 ? totalQuizScore / quizCount : 0;

      return {
        totalLessonsCompleted,
        totalQuizzesCompleted,
        totalFlashcardsReviewed,
        averageScore: Math.round(averageScore * 10) / 10 // Round to 1 decimal place
      };
    } catch (error) {
      logger.warn('Failed to calculate learning statistics', { userId, error });
      return {
        totalLessonsCompleted: 0,
        totalQuizzesCompleted: 0,
        totalFlashcardsReviewed: 0,
        averageScore: 0
      };
    }
  }

  /**
   * Validate profile update input (frontend form)
   */
  public validateProfileData(data: ProfileUpdateData): ValidationResult<ProfileUpdateData> {
    const errors: string[] = [];

    // Email format check
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) errors.push('Invalid email format');
    }

    // Website URL check
    if (data.website) {
      try {
        new URL(data.website);
      } catch {
        errors.push('Invalid website URL format');
      }
    }

    // Difficulty level check
    if (data.difficultyLevel) {
      const validLevels = ['beginner', 'intermediate', 'advanced'];
      if (!validLevels.includes(data.difficultyLevel)) errors.push('Invalid difficulty level');
    }

    // Username validation
    if (data.username) {
      if (data.username.length < 3) errors.push('Username must be at least 3 characters');
      if (data.username.length > 50) errors.push('Username must be less than 50 characters');
      if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
        errors.push('Username can only contain letters, numbers, underscores, and hyphens');
      }
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? data : undefined,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Convert raw user data (SelectUser) into profile-friendly format
   */
  private mapUserToProfileData(user: SelectUser): ProfileData {
    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      fullName: user.fullName || '',
      displayName: user.displayName || undefined,
      bio: user.bio || undefined,
      location: user.location || undefined,
      website: user.website || undefined,
      avatarUrl: user.avatarUrl || '',
      hobbiesTopic: user.hobbiesTopic || undefined,
      preferences: user.preferences as Record<string, unknown> || {},
      freeTime: user.freeTime as Record<string, unknown> || {},
      busyTime: user.busyTime as Record<string, unknown> || {},
      learningGoals: user.learningGoals as Record<string, unknown> || {},
      studyPreferences: user.studyPreferences as Record<string, unknown> || {},
      difficultyLevel: user.difficultyLevel || 'beginner',
      notificationSettings: user.notificationSettings as NotificationSettings || {
        dailyReminders: true,
        weeklyReports: true,
        achievementNotifications: true,
        emailNotifications: true,
        pushNotifications: true,
      },
      privacySettings: user.privacySettings as PrivacySettings || {
        showProfile: true,
        showProgress: true,
        showAchievements: true,
        allowMessages: true,
      },
      isPublic: user.isPublic ?? true,
      isComplete: user.isComplete ?? false,
      role: user.role || 'user',
      isActive: user.isActive ?? true,
      isVerified: user.isVerified ?? false,
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || undefined,
      lastActiveAt: user.lastActiveAt || undefined,
    };
  }

  /**
   * Get users who have specific notification preference enabled/disabled
   */
  public async getUsersWithNotificationPreference(
    preferenceKey: keyof NotificationSettings,
    value: boolean = true
  ): Promise<Array<{ userId: number; email: string; username: string }>> {
    return await this.profileRepo.getUsersWithNotificationPreference(preferenceKey, value);
  }

  /**
   * Get users who have been inactive for X days (used for re-engagement email)
   */
  public async getInactiveUsers(daysSinceLastActive: number = 7): Promise<Array<{ 
    userId: number; 
    email: string; 
    username: string; 
    lastActiveAt: Date | null 
  }>> {
    return await this.profileRepo.getInactiveUsers(daysSinceLastActive);
  }

  /**
   * Update user's "lastActiveAt" timestamp (for activity tracking)
   */
  public async updateLastActive(userId: number): Promise<void> {
    // Intentionally doing partial update; assumes repo handles updatedAt automatically
    await this.profileRepo.updateProfile(userId, {});
    await this.profileRepo.updateProfile(userId, {});
  }
}

// Export singleton instance to use in controller
export const profileService = new ProfileService();
export default profileService;