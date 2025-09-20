import { Request } from 'express';
import type { NotificationSettings, PrivacySettings } from '@/models/user.model';

// Extend Express Request to include user
// export interface AuthenticatedRequest extends Request {
//   currentUser?: {
//     userId: string;
//     username: string;
//     email: string;
//     role: string;
//   };
// }

// Profile data interface - extends the database model
export interface ProfileData {
  userId: number;
  username: string;
  email: string;
  fullName?: string;
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatarUrl: string;
  hobbiesTopic?: string;
  preferences?: Record<string, unknown>;
  freeTime?: Record<string, unknown>;
  busyTime?: Record<string, unknown>;
  learningGoals?: Record<string, unknown>;
  studyPreferences?: Record<string, unknown>;
  difficultyLevel?: string;
  notificationSettings: NotificationSettings;
  privacySettings: PrivacySettings;
  isPublic?: boolean;
  isComplete?: boolean;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt?: Date;
  lastActiveAt?: Date;
}

// Profile update data
export interface ProfileUpdateData {
  username?: string;
  email?: string;
  fullName?: string;
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatarUrl?: string;
  hobbiesTopic?: string;
  preferences?: Record<string, unknown>;
  freeTime?: Record<string, unknown>;
  busyTime?: Record<string, unknown>;
  learningGoals?: Record<string, unknown>;
  studyPreferences?: Record<string, unknown>;
  difficultyLevel?: string;
  isPublic?: boolean;
}

// Password change data
export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

// User settings
export interface UserSettings {
  notifications?: NotificationSettings;
  privacy?: PrivacySettings;
}

// Validation result
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

// Profile creation data
export interface ProfileCreateData {
  userId: number;
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  learningGoals?: any;
  studyPreferences?: any;
  difficultyLevel?: string;
  notificationSettings?: NotificationSettings;
  privacySettings?: PrivacySettings;
  isPublic?: boolean;
}
