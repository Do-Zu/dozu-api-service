import { Request,Response } from 'express';
import { SuccessResponse } from '@/core/success';
import ProfileService from '@/services/profile/profile.service';


class ProfileController {
  // Get user profile
   public async getProfile(req: Request, res: Response): Promise<void> {
    const userId = req.currentUser!.userId;
    const profile = await ProfileService.getProfile(parseInt(userId));
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
