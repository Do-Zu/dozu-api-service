// Types for class topic comments

export type TopicIdCommentClass = number | null;

export type ParentCommentId = number | null;

export type NodeId = string;

export interface IClassTopicComment {
    commentId: number;
    topicId: TopicIdCommentClass;
    nodeId: NodeId;
    author: {
        user_id: number;
        name: string;
        avatar?: string;
    };
    typeNode: string;
    isDeleted: boolean;
    parentCmtId?: ParentCommentId;
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
    nodeId?: NodeId;
    typeNode?: string;
    parentCmtId?: ParentCommentId;
    level?: number;
    page?: number;
    limit?: number;
    includeReplies?: boolean;
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
