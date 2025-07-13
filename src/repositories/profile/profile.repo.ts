import { eq } from 'drizzle-orm';
import db from '@/libs/drizzleClient.lib';
import { usersTable, type SelectUser } from '@/models/user.model';
import { 
  profilesTable, 
  type SelectProfile, 
  type InsertProfile, 
  type ProfileWithUser,
  type ProfileUpdateData as ModelProfileUpdateData,
  type NotificationSettings,
  type PrivacySettings
} from '@/models/profile/profile.model';
import { NotFoundError } from '@/core/error';
import { 
  ProfileUpdateData, 
  ProfileCreateData
} from '@/types/profile/profile.types';

/**
 * Repository for Profile data access operations
 */
class ProfileRepository {
  
  /**
   * Create a new profile for a user
   */
  async createProfile(data: ProfileCreateData): Promise<SelectProfile> {
    const profileData: InsertProfile = {
      userId: data.userId,
      displayName: data.displayName,
      bio: data.bio,
      location: data.location,
      website: data.website,
      learningGoals: data.learningGoals,
      studyPreferences: data.studyPreferences,
      difficultyLevel: data.difficultyLevel || 'beginner',
      notificationSettings: data.notificationSettings || {
        dailyReminders: true,
        weeklyReports: true,
        achievementNotifications: true,
        emailNotifications: true,
        pushNotifications: true,
      },
      privacySettings: data.privacySettings || {
        showProfile: true,
        showProgress: true,
        showAchievements: true,
        allowMessages: true,
      },
      isPublic: data.isPublic !== undefined ? data.isPublic : true,
      isComplete: false,
      updatedAt: new Date(),
    };

    const [profile] = await db
      .insert(profilesTable)
      .values(profileData)
      .returning();

    if (!profile) {
      throw new Error('Failed to create profile');
    }

    return profile;
  }

  /**
   * Get complete profile with user data by user ID
   */
  async getCompleteProfileByUserId(userId: number): Promise<ProfileWithUser | null> {
    const result = await db
      .select({
        profileId: profilesTable.profileId,
        userId: profilesTable.userId,
        displayName: profilesTable.displayName,
        bio: profilesTable.bio,
        location: profilesTable.location,
        website: profilesTable.website,
        learningGoals: profilesTable.learningGoals,
        studyPreferences: profilesTable.studyPreferences,
        difficultyLevel: profilesTable.difficultyLevel,
        notificationSettings: profilesTable.notificationSettings,
        privacySettings: profilesTable.privacySettings,
        isPublic: profilesTable.isPublic,
        isComplete: profilesTable.isComplete,
        createdAt: profilesTable.createdAt,
        updatedAt: profilesTable.updatedAt,
        lastActiveAt: profilesTable.lastActiveAt,
        user: {
          userId: usersTable.userId,
          username: usersTable.username,
          email: usersTable.email,
          fullName: usersTable.fullName,
          avatarUrl: usersTable.avatarUrl,
          hobbiesTopic: usersTable.hobbiesTopic,
          preferences: usersTable.preferences,
          freeTime: usersTable.freeTime,
          busyTime: usersTable.busyTime,
          role: usersTable.role,
          isActive: usersTable.isActive,
          isVerified: usersTable.isVerified,
          createdAt: usersTable.createdAt,
        }
      })
      .from(profilesTable)
      .innerJoin(usersTable, eq(profilesTable.userId, usersTable.userId))
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    return result[0] as ProfileWithUser || null;
  }

  /**
   * Get profile by user ID
   */
  async getProfileByUserId(userId: number): Promise<SelectProfile | null> {
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    return profile || null;
  }

  /**
   * Get user by user ID (for backward compatibility)
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
   * Update profile data
   */
  async updateProfile(userId: number, data: ProfileUpdateData): Promise<SelectProfile> {
    const updateData: Partial<ModelProfileUpdateData> = {
      displayName: data.displayName,
      bio: data.bio,
      location: data.location,
      website: data.website,
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

    const [updatedProfile] = await db
      .update(profilesTable)
      .set(updateData)
      .where(eq(profilesTable.userId, userId))
      .returning();

    if (!updatedProfile) {
      throw new NotFoundError('Profile not found during update');
    }

    return updatedProfile;
  }

  /**
   * Update user data (name, email, avatar, etc.)
   */
  async updateUserData(userId: number, data: Partial<{
    fullName: string;
    email: string;
    avatarUrl: string;
    hobbiesTopic: string;
    preferences: Record<string, unknown>;
    freeTime: Record<string, unknown>;
    busyTime: Record<string, unknown>;
  }>): Promise<SelectUser> {
    const updateData = {
      ...data,
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
  async updateNotificationSettings(userId: number, settings: NotificationSettings): Promise<SelectProfile> {
    const [updatedProfile] = await db
      .update(profilesTable)
      .set({
        notificationSettings: settings,
        updatedAt: new Date()
      })
      .where(eq(profilesTable.userId, userId))
      .returning();

    if (!updatedProfile) {
      throw new NotFoundError('Profile not found during notification settings update');
    }

    return updatedProfile;
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(userId: number, settings: PrivacySettings): Promise<SelectProfile> {
    const [updatedProfile] = await db
      .update(profilesTable)
      .set({
        privacySettings: settings,
        updatedAt: new Date()
      })
      .where(eq(profilesTable.userId, userId))
      .returning();

    if (!updatedProfile) {
      throw new NotFoundError('Profile not found during privacy settings update');
    }

    return updatedProfile;
  }

  /**
   * Check if profile exists for user
   */
  async profileExists(userId: number): Promise<boolean> {
    const [profile] = await db
      .select({ profileId: profilesTable.profileId })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    return !!profile;
  }

  /**
   * Delete profile
   */
  async deleteProfile(userId: number): Promise<void> {
    const result = await db
      .delete(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('Profile not found for deletion');
    }
  }

  /**
   * Get or create profile for user (ensures profile exists)
   */
  async getOrCreateProfile(userId: number): Promise<SelectProfile> {
    // First try to get existing profile
    const existingProfile = await this.getProfileByUserId(userId);
    if (existingProfile) {
      return existingProfile;
    }

    // If no profile exists, create one with default values
    return this.createProfile({
      userId,
      difficultyLevel: 'beginner',
      isPublic: true,
    });
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
   * Get users with specific notification preference enabled
   * Used by notification scheduler to send targeted notifications
   */
  async getUsersWithNotificationPreference(
    preferenceKey: keyof NotificationSettings, 
    value: boolean = true
  ): Promise<Array<{ userId: number; email: string; username: string }>> {
    const results = await db
      .select({
        userId: profilesTable.userId,
        email: usersTable.email,
        username: usersTable.username,
        notificationSettings: profilesTable.notificationSettings
      })
      .from(profilesTable)
      .innerJoin(usersTable, eq(profilesTable.userId, usersTable.userId))
      .where(eq(usersTable.isActive, true)); // Only get active users

    // Filter based on notification preference
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
   * Get all users for bulk notifications
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
   * Get users who haven't been active for X days (for re-engagement notifications)
   */
  async getInactiveUsers(daysSinceLastActive: number = 7): Promise<Array<{ userId: number; email: string; username: string; lastActiveAt: Date | null }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastActive);

    const results = await db
      .select({
        userId: profilesTable.userId,
        email: usersTable.email,
        username: usersTable.username,
        lastActiveAt: profilesTable.lastActiveAt
      })
      .from(profilesTable)
      .innerJoin(usersTable, eq(profilesTable.userId, usersTable.userId))
      .where(eq(usersTable.isActive, true));

    // Filter for users who are inactive or never had activity
    return results.filter(result => {
      if (!result.lastActiveAt) return true; // Never active
      return result.lastActiveAt < cutoffDate;
    });
  }
}

export default ProfileRepository;
