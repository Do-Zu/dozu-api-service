import { IClassInviteSelected } from '@/models/class-based-learning/classInvite.model';

export interface IClassInvite extends IClassInviteSelected {}

export interface IInviteByEmailBody {
    emails: string[];
    expiresInDays?: number; // default 7 days
    useLimit?: number; // default null (unlimited)
}

export interface IGenerateInviteLinkBody {
    expiresInDays?: number; // default 7 days
    useLimit?: number; // default null (unlimited)
}

export interface IJoinViaInviteBody {
    token: string;
}

export interface IInviteResponse {
    inviteId: number;
    classId: number;
    token: string;
    inviteLink: string;
    expiresAt: Date;
    useLimit: number | null;
    usedCount: number;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
    createdAt: Date;
}

export interface IInviteEmailResponse {
    success: boolean;
    email: string;
    message: string;
}

export interface IInviteEmailBatchResponse {
    totalSent: number;
    totalFailed: number;
    results: IInviteEmailResponse[];
}

export interface IUserSearchResult {
    userId: number;
    username: string;
    email: string;
    fullName: string | null;
    avatarUrl: string;
    isAlreadyInClass?: boolean;
}

export interface IClassInviteWithDetails extends IClassInvite {
    className: string;
    teacherName: string;
    invitedUserName?: string;
    invitedUserEmail?: string;
}
