import { IClassFeedType } from '@/models/class-based-learning/classFeed.model';

export interface IClassFeed {
    classFeedId: number;
    classId: number;
    senderId: number;
    type: IClassFeedType;
    title: string;
    content: string;
    link?: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;

    sender?: {
        avatarUrl: string;
        fullName: string | null;
    };
}

export type ICreateClassFeedBody = Pick<IClassFeed, 'title' | 'content' | 'link'>;
export type IUpdateClassFeedBody = Pick<IClassFeed, 'title' | 'content' | 'link'>;