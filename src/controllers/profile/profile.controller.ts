import { Response } from 'express';
import { SuccessResponse } from '@/core/success';
import { BadRequest } from '@/core/error';
import ProfileService from '@/services/profile/profile.service';
import type { AuthenticatedRequest } from '@/types/profile/profile.types';

export class ProfileController {
  // Get user profile
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new BadRequest('User not authenticated');
    }

    const profile = await ProfileService.getProfile(parseInt(userId));
    SuccessResponse.ok(res, profile);
  }

  // Update user profile
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new BadRequest('User not authenticated');
    }

    const updatedProfile = await ProfileService.updateProfile(parseInt(userId), req.body);
    SuccessResponse.ok(res, updatedProfile, 'Profile updated successfully');
  }

  // Upload avatar
  static async uploadAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new BadRequest('User not authenticated');
    }

    if (!req.file) {
      throw new BadRequest('No file uploaded');
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new BadRequest('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      throw new BadRequest('File too large. Maximum size is 5MB.');
    }

    const avatarUrl = await ProfileService.uploadAvatar(parseInt(userId), req.file);
    SuccessResponse.ok(res, { avatarUrl }, 'Avatar uploaded successfully');
  }

  // Remove avatar
  static async removeAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new BadRequest('User not authenticated');
    }

    await ProfileService.removeAvatar(parseInt(userId));
    SuccessResponse.ok(res, null, 'Avatar removed successfully');
  }

  // Change password
  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new BadRequest('User not authenticated');
    }

    await ProfileService.changePassword(parseInt(userId), req.body);
    SuccessResponse.ok(res, null, 'Password changed successfully');
  }

  // Update notification settings
  static async updateNotificationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new BadRequest('User not authenticated');
    }

    const settings = await ProfileService.updateNotificationSettings(parseInt(userId), req.body);
    SuccessResponse.ok(res, settings, 'Notification settings updated successfully');
  }

  // Update privacy settings
  static async updatePrivacySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new BadRequest('User not authenticated');
    }

    const settings = await ProfileService.updatePrivacySettings(parseInt(userId), req.body);
    SuccessResponse.ok(res, settings, 'Privacy settings updated successfully');
  }

  // Update user settings (combined notification and privacy)
  static async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new BadRequest('User not authenticated');
    }

    const settings = await ProfileService.updateSettings(parseInt(userId), req.body);
    SuccessResponse.ok(res, settings, 'Settings updated successfully');
  }

  // Delete account
  static async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new BadRequest('User not authenticated');
    }

    await ProfileService.deleteAccount(parseInt(userId));
    SuccessResponse.ok(res, null, 'Account deleted successfully');
  }

  // Get activity statistics
  static async getActivityStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new BadRequest('User not authenticated');
    }

    const stats = await ProfileService.getActivityStats();
    SuccessResponse.ok(res, stats);
  }

  // Get achievements
  static async getAchievements(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new BadRequest('User not authenticated');
    }

    const achievements = await ProfileService.getAchievements();
    SuccessResponse.ok(res, achievements);
  }
}

export default ProfileController;
