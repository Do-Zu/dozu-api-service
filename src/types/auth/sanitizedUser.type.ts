export interface SanitizedUser {
  userId: number;
  username: string;
  email: string;
  fullName: string | null;
  avatarUrl: string;
}
