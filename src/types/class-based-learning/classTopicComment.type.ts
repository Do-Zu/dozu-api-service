// Types for class topic comments
export interface IClassTopicComment {
    commentId: number;
    topicId: number;
    nodeId: string;
    author: {
        user_id: number;
        name: string;
        avatar?: string;
    };
    typeNode: 'mindmap' | 'flashcard' | 'quiz';
    isDeleted: boolean;
    parentCmtId?: number | null;
    level: number;
    content: string;
    reactionCount: number;
    replyCount: number;
    createdAt: Date;
    updatedAt: Date;

    // Optional fields for joined data
    replies?: IClassTopicComment[];
}

// Request/Response DTOs
export type ICreateCommentBody = Pick<
    IClassTopicComment,
    'nodeId' | 'typeNode' | 'content' | 'parentCmtId' | 'topicId' | 'author'
>;
export type IUpdateCommentBody = Pick<IClassTopicComment, 'content'>;

export interface IGetCommentsQuery {
    nodeId?: string;
    typeNode?: 'mindmap' | 'flashcard' | 'quiz';
    parentCmtId?: number | null;
    level?: number;
    page?: number;
    limit?: number;
}

export interface ICreateCommentResponse {
    commentId: number;
    content: string;
    level: number;
    createdAt: Date;
}

export interface ICommentReactionBody {
    reactionType: 'like' | 'dislike' | 'love' | 'laugh' | 'angry';
}
