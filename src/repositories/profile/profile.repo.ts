import { eq } from 'drizzle-orm';
import db from '@/libs/drizzleClient.lib';
import { usersTable, type SelectUser, type UserUpdateData, type NotificationSettings, type PrivacySettings } from '@/models/user.model';
import { NotFoundError } from '@/core/error';
import { ProfileUpdateData } from '@/types/profile/profile.types';

/**
 * Repository for Profile data access operations (now using users table directly)
 */
class ProfileRepository {
  
  /**
   * Get user by user ID
   */
  async getUserById(userId: number): Promise<SelectUser | null> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.userId, userId))
      .limit(1);

    return user || null;
  }

  /**
   * Update user profile data
   */
  async updateProfile(userId: number, data: ProfileUpdateData): Promise<SelectUser> {
    const updateData: UserUpdateData = {
      username: data.username,
      email: data.email,
      fullName: data.fullName,
      displayName: data.displayName,
      bio: data.bio,
      location: data.location,
      website: data.website,
      avatarUrl: data.avatarUrl,
      hobbiesTopic: data.hobbiesTopic,
      preferences: data.preferences,
      freeTime: data.freeTime,
      busyTime: data.busyTime,
      learningGoals: data.learningGoals,
      studyPreferences: data.studyPreferences,
      difficultyLevel: data.difficultyLevel,
      isPublic: data.isPublic,
      updatedAt: new Date(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const [updatedUser] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.userId, userId))
      .returning();

    if (!updatedUser) {
      throw new NotFoundError('User not found during update');
    }

    return updatedUser;
  }

  /**
   * Update user password hash
   */
  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    const [updatedUser] = await db
      .update(usersTable)
      .set({
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(usersTable.userId, userId))
      .returning();

    if (!updatedUser) {
      throw new NotFoundError('User not found during password update');
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(userId: number, settings: NotificationSettings): Promise<NotificationSettings> {
    const [updatedUser] = await db
      .update(usersTable)
      .set({
        notificationSettings: settings,
        updatedAt: new Date()
      })
      .where(eq(usersTable.userId, userId))
      .returning();

    if (!updatedUser) {
      throw new NotFoundError('User not found during notification settings update');
    }

    return updatedUser.notificationSettings as NotificationSettings;
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(userId: number, settings: PrivacySettings): Promise<PrivacySettings> {
    const [updatedUser] = await db
      .update(usersTable)
      .set({
        privacySettings: settings,
        updatedAt: new Date()
      })
      .where(eq(usersTable.userId, userId))
      .returning();

    if (!updatedUser) {
      throw new NotFoundError('User not found during privacy settings update');
    }

    return updatedUser.privacySettings as PrivacySettings;
  }

  /**
   * Get user password hash for verification
   */
  async getUserPasswordHash(userId: number): Promise<string | null> {
    const [user] = await db
      .select({ passwordHash: usersTable.passwordHash })
      .from(usersTable)
      .where(eq(usersTable.userId, userId))
      .limit(1);

    return user?.passwordHash || null;
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: number): Promise<void> {
    const result = await db
      .delete(usersTable)
      .where(eq(usersTable.userId, userId))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('User not found for deletion');
    }
  }

  /**
   * Get users with specific notification preference enabled
   */
  async getUsersWithNotificationPreference(
    preferenceKey: keyof NotificationSettings, 
    value: boolean = true
  ): Promise<Array<{ userId: number; email: string; username: string }>> {
    const results = await db
      .select({
        userId: usersTable.userId,
        email: usersTable.email,
        username: usersTable.username,
        notificationSettings: usersTable.notificationSettings
      })
      .from(usersTable)
      .where(eq(usersTable.isActive, true));

    return results.filter(result => {
      const settings = result.notificationSettings as NotificationSettings;
      return settings && settings[preferenceKey] === value;
    }).map(result => ({
      userId: result.userId,
      email: result.email,
      username: result.username
    }));
  }

  /**
   * Get all active users
   */
  async getAllActiveUsers(): Promise<Array<{ userId: number; email: string; username: string }>> {
    const results = await db
      .select({
        userId: usersTable.userId,
        email: usersTable.email,
        username: usersTable.username
      })
      .from(usersTable)
      .where(eq(usersTable.isActive, true));

    return results;
  }

  /**
   * Get inactive users for re-engagement
   */
  async getInactiveUsers(daysSinceLastActive: number = 7): Promise<Array<{ userId: number; email: string; username: string; lastActiveAt: Date | null }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastActive);

    const results = await db
      .select({
        userId: usersTable.userId,
        email: usersTable.email,
        username: usersTable.username,
        lastActiveAt: usersTable.lastActiveAt
      })
      .from(usersTable)
      .where(eq(usersTable.isActive, true));

    return results.filter(result => {
      if (!result.lastActiveAt) return true;
      return result.lastActiveAt < cutoffDate;
    });
  }
}

export default ProfileRepository;
