export type SanitizedUser = {
    userId: number;
    username: string;
    email: string;
    fullName: string;
    avatarUrl: string;
    isNewUser: boolean;
    hasCompletedOnboarding: boolean;
    createdAt: string | Date | null;
    lastLoginAt: string | Date | null;
    permissions: string[];
    roles: string[];
};
