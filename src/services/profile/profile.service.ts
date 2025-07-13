import ProfileRepository from '@/repositories/profile/profile.repo';
import { NotFoundError, BadRequest } from '@/core/error';
import { hashPassword, verifyPassword } from '@/utils/auth/hash.utils';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/utils/logger';
import type { 
  ProfileData, 
  ProfileUpdateData, 
  PasswordChangeData, 
  UserSettings,
  ProfileCreateData,
  ValidationResult
} from '@/types/profile/profile.types';
import type { 
  NotificationSettings, 
  PrivacySettings, 
  ProfileWithUser
} from '@/models/profile/profile.model';

/**
 * Service class for Profile functionality
 */
export class ProfileService {
  private static profileRepo = new ProfileRepository();

  /**
   * Get complete user profile by user ID
   */
  static async getProfile(userId: number): Promise<ProfileData> {
  
      const profileWithUser = await this.profileRepo.getCompleteProfileByUserId(userId);
      if (!profileWithUser) {
        throw new NotFoundError('Profile not found');
      }

      return this.mapProfileWithUserToProfileData(profileWithUser);
   
  }

  /**
   * Create a new profile for a user
   */
  static async createProfile(data: ProfileCreateData): Promise<ProfileData> {
  
      await this.profileRepo.createProfile(data);
      const completeProfile = await this.profileRepo.getCompleteProfileByUserId(data.userId);
      
      if (!completeProfile) {
        throw new Error('Failed to retrieve created profile');
      }

      return this.mapProfileWithUserToProfileData(completeProfile);
    
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: number, data: ProfileUpdateData): Promise<ProfileData> {
 
      // Ensure profile exists
      await this.profileRepo.getOrCreateProfile(userId);

      // Separate profile data from user data
      const profileData: ProfileUpdateData = {
        displayName: data.displayName,
        bio: data.bio,
        location: data.location,
        website: data.website,
        learningGoals: data.learningGoals,
        studyPreferences: data.studyPreferences,
        difficultyLevel: data.difficultyLevel,
        isPublic: data.isPublic,
      };

      const userData = {
        fullName: data.fullName,
        email: data.email,
        avatarUrl: data.avatarUrl,
        hobbiesTopic: data.hobbiesTopic,
        preferences: data.preferences,
        freeTime: data.freeTime,
        busyTime: data.busyTime,
      };

      // Update profile data if any profile fields are provided
      const hasProfileData = Object.values(profileData).some(value => value !== undefined);
      if (hasProfileData) {
        await this.profileRepo.updateProfile(userId, profileData);
      }

      // Update user data if any user fields are provided
      const hasUserData = Object.values(userData).some(value => value !== undefined);
      if (hasUserData) {
        await this.profileRepo.updateUserData(userId, userData);
      }

      // Return updated complete profile
      return await this.getProfile(userId);
    
  }

  /**
   * Upload user avatar
   */
  static async uploadAvatar(userId: number, file: { 
    buffer?: Buffer; 
    path?: string;
    originalname: string; 
    mimetype: string; 
    size: number 
  }): Promise<string> {
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
      await fs.mkdir(uploadsDir, { recursive: true });

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      // Handle different multer storage types
      if (file.buffer) {
        // Memory storage - file is in buffer
        await fs.writeFile(filePath, file.buffer);
      } else if (file.path) {
        // Disk storage - file is already saved, need to move it
        await fs.copyFile(file.path, filePath);
        // Optionally delete the temporary file
        try {
          await fs.unlink(file.path);
        } catch (unlinkErr) {
          logger.warn('Failed to delete temporary file:', file.path, unlinkErr);
        }
      } else {
        throw new Error('File data not found (neither buffer nor path)');
      }

      // Generate avatar URL (adjust based on your server setup)
      const avatarUrl = `/uploads/avatars/${fileName}`;

      // Update user avatar in database
      await this.profileRepo.updateUserData(userId, { avatarUrl });

      return avatarUrl;
    } catch (error) {
      logger.error('Error uploading avatar:', error);
      throw error;
    }
  }

  /**
   * Remove user avatar
   */
  static async removeAvatar(userId: number): Promise<void> {
   
      // Get current user to check if they have an avatar
      const user = await this.profileRepo.getUserById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      
      // Reset to default avatar
      const defaultAvatarUrl = 'https://res.cloudinary.com/dsvllb1am/image/upload/f_auto,q_auto/v1/default/tcd6nnm6lgn0jb3puton';
      
      // If user has a custom avatar (not the default), try to delete the file
      if (user.avatarUrl && user.avatarUrl !== defaultAvatarUrl && user.avatarUrl.startsWith('/uploads/')) {
        try {
          const filePath = path.join(process.cwd(), user.avatarUrl);
          await fs.unlink(filePath);
        } catch (fileError) {
          // Log but don't throw - file might not exist
          logger.warn('Could not delete avatar file:', fileError);
        }
      }

      // Update user avatar to default
      await this.profileRepo.updateUserData(userId, { avatarUrl: defaultAvatarUrl });
   
  }

  /**
   * Change user password
   */
  static async changePassword(userId: number, passwordData: PasswordChangeData): Promise<void> {
  
      // Get current password hash
      const currentPasswordHash = await this.profileRepo.getUserPasswordHash(userId);
      if (!currentPasswordHash) {
        throw new NotFoundError('User not found or no password set');
      }

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(passwordData.currentPassword, currentPasswordHash);
      if (!isCurrentPasswordValid) {
        throw new BadRequest('Invalid current password');
      }

      // Hash new password
      const newPasswordHash = await hashPassword(passwordData.newPassword);

      // Update password
      await this.profileRepo.updatePassword(userId, newPasswordHash);
    
  }

  /**
   * Update notification settings
   */
  static async updateNotificationSettings(userId: number, settings: NotificationSettings): Promise<NotificationSettings> {
 
      // Ensure profile exists
      await this.profileRepo.getOrCreateProfile(userId);

      // Update notification settings
      const updatedProfile = await this.profileRepo.updateNotificationSettings(userId, settings);
      
      return updatedProfile.notificationSettings as NotificationSettings;
    
  }

  /**
   * Update privacy settings
   */
  static async updatePrivacySettings(userId: number, settings: PrivacySettings): Promise<PrivacySettings> {
  
      // Ensure profile exists
      await this.profileRepo.getOrCreateProfile(userId);

      // Update privacy settings
      const updatedProfile = await this.profileRepo.updatePrivacySettings(userId, settings);
      
      return updatedProfile.privacySettings as PrivacySettings;
    
  }

  /**
   * Update user settings (combines notification and privacy settings)
   */
  static async updateSettings(userId: number, settings: UserSettings): Promise<UserSettings> {
    
      const result: UserSettings = {};

      if (settings.notifications) {
        result.notifications = await this.updateNotificationSettings(userId, settings.notifications);
      }

      if (settings.privacy) {
        result.privacy = await this.updatePrivacySettings(userId, settings.privacy);
      }

      return result;
    
  }

  /**
   * Delete user account and profile
   */
  static async deleteAccount(userId: number): Promise<void> {
   
      // Get user to check if avatar needs to be deleted
      const user = await this.profileRepo.getUserById(userId);
      
      if (user) {
        // Delete avatar file if it's a custom upload
        const defaultAvatarUrl = 'https://res.cloudinary.com/dsvllb1am/image/upload/f_auto,q_auto/v1/default/tcd6nnm6lgn0jb3puton';
        if (user.avatarUrl && user.avatarUrl !== defaultAvatarUrl && user.avatarUrl.startsWith('/uploads/')) {
          try {
            const filePath = path.join(process.cwd(), user.avatarUrl);
            await fs.unlink(filePath);
          } catch (fileError) {
            // Log but don't throw - file might not exist
            logger.warn('Could not delete avatar file during account deletion:', fileError);
          }
        }
      }

      // Check if profile exists and delete it
      const profile = await this.profileRepo.getProfileByUserId(userId);
      if (profile) {
        // Delete profile record
        await this.profileRepo.deleteProfile(userId);
      }
   
  }

  /**
   * Get user activity statistics
   */
  static async getActivityStats(): Promise<{
    totalTopics: number;
    totalFlashcards: number;
    studyStreak: number;
    lastActivity: Date | null;
  }> {
    // Note: This is a placeholder implementation
    // You would need to implement actual queries to get real statistics
    // from topics, flashcards, and study sessions tables
    
    return {
      totalTopics: 0,
      totalFlashcards: 0,
      studyStreak: 0,
      lastActivity: null
    };
  }

  /**
   * Get user achievements
   */
  static async getAchievements(): Promise<Array<{
    id: string;
    title: string;
    description: string;
    earnedAt: Date;
    icon: string;
  }>> {
    // Note: This is a placeholder implementation
    // You would need to implement actual achievement system
    
    return [];
  }

  /**
   * Validate profile data
   */
  static validateProfileData(data: ProfileUpdateData): ValidationResult<ProfileUpdateData> {
    const errors: string[] = [];

    // Validate email format if provided
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Invalid email format');
      }
    }

    // Validate website URL if provided
    if (data.website) {
      try {
        new URL(data.website);
      } catch {
        errors.push('Invalid website URL format');
      }
    }

    // Validate difficulty level if provided
    if (data.difficultyLevel) {
      const validLevels = ['beginner', 'intermediate', 'advanced'];
      if (!validLevels.includes(data.difficultyLevel)) {
        errors.push('Invalid difficulty level');
      }
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? data : undefined,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Map ProfileWithUser to ProfileData for API responses
   */
  private static mapProfileWithUserToProfileData(profileWithUser: ProfileWithUser): ProfileData {
    return {
      profileId: profileWithUser.profileId,
      userId: profileWithUser.userId,
      fullName: profileWithUser.user.fullName || '',
      email: profileWithUser.user.email,
      username: profileWithUser.user.username,
      displayName: profileWithUser.displayName || undefined,
      bio: profileWithUser.bio || undefined,
      location: profileWithUser.location || undefined,
      website: profileWithUser.website || undefined,
      avatarUrl: profileWithUser.user.avatarUrl || '',
      hobbiesTopic: profileWithUser.user.hobbiesTopic || '',
      preferences: profileWithUser.user.preferences || {},
      freeTime: profileWithUser.user.freeTime || {},
      busyTime: profileWithUser.user.busyTime || {},
      learningGoals: profileWithUser.learningGoals as Record<string, unknown> || {},
      studyPreferences: profileWithUser.studyPreferences as Record<string, unknown> || {},
      difficultyLevel: profileWithUser.difficultyLevel || 'beginner',
      notificationSettings: profileWithUser.notificationSettings as NotificationSettings,
      privacySettings: profileWithUser.privacySettings as PrivacySettings,
      isPublic: profileWithUser.isPublic || false,
      isComplete: profileWithUser.isComplete || false,
      role: profileWithUser.user.role || 'user',
      isActive: profileWithUser.user.isActive || false,
      isVerified: profileWithUser.user.isVerified || false,
      createdAt: profileWithUser.createdAt || new Date(),
      updatedAt: profileWithUser.updatedAt || undefined,
      lastActiveAt: profileWithUser.lastActiveAt || undefined,
    };
  }
}

export default ProfileService;
