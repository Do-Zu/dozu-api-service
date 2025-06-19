export type SanitizedUser = {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  isNewUser: boolean;
  hasCompletedOnboarding: boolean;
  createdAt: string;
  lastLoginAt: string;
  permissions: string[];
  roles: string[];
};
