// Types for comments

export interface IComment {
    commentId: number;
    senderId: number;
    content: string;
    parentCommentId: number | null;
    createdAt: Date;
    updatedAt: Date | null;
    sender?: {
        userId: number;
        username: string;
        fullName: string | null;
        avatarUrl: string | null;
    };
    replies?: IComment[];
}

export interface ICreateCommentBody {
    content: string;
    parentCommentId?: number;
}

export interface IUpdateCommentBody {
    content: string;
}

export interface IGetCommentsQuery {
    page?: number;
    limit?: number;
}

