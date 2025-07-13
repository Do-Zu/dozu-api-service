import { Request } from 'express';
import { ProfileWithUser, NotificationSettings, PrivacySettings } from '@/models/profile/profile.model';

// Extend Express Request to include user
export interface AuthenticatedRequest extends Request {
  currentUser?: {
    userId: string;
    roles: string[];
    email: string;
    iat?: number;
    exp?: number;
  };
}

// Profile data interface - extends the database model
export interface ProfileData {
  profileId: number;
  userId: number;
  fullName: string;
  email: string;
  username: string;
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatarUrl: string;
  hobbiesTopic: string;
  preferences: Record<string, unknown>;
  freeTime: Record<string, unknown>;
  busyTime: Record<string, unknown>;
  learningGoals?: Record<string, unknown>;
  studyPreferences?: Record<string, unknown>;
  difficultyLevel: string;
  notificationSettings: NotificationSettings;
  privacySettings: PrivacySettings;
  isPublic: boolean;
  isComplete: boolean;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt?: Date;
  lastActiveAt?: Date;
}

// Profile update data
export interface ProfileUpdateData {
  fullName?: string;
  email?: string;
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

// Validation result
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

// User settings
export interface UserSettings {
  notifications?: NotificationSettings;
  privacy?: PrivacySettings;
}

// Profile creation data
export interface ProfileCreateData {
  userId: number;
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  learningGoals?: Record<string, unknown>;
  studyPreferences?: Record<string, unknown>;
  difficultyLevel?: string;
  notificationSettings?: NotificationSettings;
  privacySettings?: PrivacySettings;
  isPublic?: boolean;
}

// Complete profile response type
export type ProfileResponse = ProfileWithUser;
