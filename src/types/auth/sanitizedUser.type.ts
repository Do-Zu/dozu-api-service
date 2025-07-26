import { SelectUser } from '@/models';

// Pick some important fields of SelectUser
export type SanitizedUser = Pick<
    SelectUser,
    | 'userId'
    | 'username'
    | 'email'
    | 'fullName'
    | 'avatarUrl'
    | 'isNewUser'
    | 'hasCompletedOnboarding'
    | 'createdAt'
    | 'lastLoginAt'
> & {
    // Additional fields that are not found in User table 
    permissions: string[];
    roles: string[];
};
