import { Request,Response } from 'express';
import { SuccessResponse } from '@/core/success';
import ProfileService from '@/services/profile/profile.service';
<<<<<<< HEAD
import type { AuthenticatedRequest } from '@/types/profile/profile.types';
import { isTeacher } from '@/utils/auth/authHelpers.utils';
import { Forbidden } from '@/core/error';
=======

>>>>>>> af6eeebad48967cd25f720822fead15753ea812e

class ProfileController {
  // Get user profile
   public async getProfile(req: Request, res: Response): Promise<void> {
    const userId = req.currentUser!.userId;
    const profile = await ProfileService.getProfile(parseInt(userId));
    SuccessResponse.ok(res, profile);
  }

  // Get user profile by ID (for teachers to view student profiles)
  public async getProfileById(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Check if the current user is a teacher
    const teacherCheck = await isTeacher(req);
    if (!teacherCheck) {
      throw new Forbidden('Only teachers can view other users\' profiles');
    }

    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      throw new Error('Invalid user ID');
    }
    
    const profile = await ProfileService.getProfile(userId);
    SuccessResponse.ok(res, profile);
  }

  // Update user profile
  async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.currentUser!.userId;
    const updatedProfile = await ProfileService.updateProfile(parseInt(userId), req.body);
    SuccessResponse.ok(res, updatedProfile, 'Profile updated successfully');
  }

  // Upload avatar

  // Change password
   async changePassword(req: Request, res: Response): Promise<void> {
    const userId = req.currentUser!.userId;

    await ProfileService.changePassword(parseInt(userId), req.body);
    SuccessResponse.ok(res, null, 'Password changed successfully');
  }

  // Update notification settings
  async updateNotificationSettings(req: Request, res: Response): Promise<void> {
    const userId = req.currentUser!.userId;

    const settings = await ProfileService.updateNotificationSettings(parseInt(userId), req.body);
    SuccessResponse.ok(res, settings, 'Notification settings updated successfully');
  }

  // Update privacy settings
  async updatePrivacySettings(req: Request, res: Response): Promise<void> {
    const userId = req.currentUser!.userId;

    const settings = await ProfileService.updatePrivacySettings(parseInt(userId), req.body);
    SuccessResponse.ok(res, settings, 'Privacy settings updated successfully');
  }

  // Update user settings (combined notification and privacy)
  async updateSettings(req: Request, res: Response): Promise<void> {
    const userId = req.currentUser!.userId;

    const settings = await ProfileService.updateSettings(parseInt(userId), req.body);
    SuccessResponse.ok(res, settings, 'Settings updated successfully');
  }

  // Delete account
  async deleteAccount(req: Request, res: Response): Promise<void> {
    const userId = req.currentUser!.userId;

    await ProfileService.deleteAccount(parseInt(userId));
    SuccessResponse.ok(res, null, 'Account deleted successfully');
  }

 
}

// export default ProfileController;
export const profileController = new ProfileController();
