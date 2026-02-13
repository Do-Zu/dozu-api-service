export interface ITopic {
    topicId: number;
    name: string;
    description: string;
    createdAt: Date;

    userId?: number;
    classId?: number | null;
    imageUrl?: string | null;
    flashcardCounts?: IFlashcardCounts;
    hasProgress?: boolean;
}

export interface ITopicOverview extends ITopic {
    itemTrackings: IItemTrackingTopic[];
}
export interface IFlashcardCounts {
    new: number;
    learning: number;
    review: number;
    total: number;
}

export interface IItemTrackingTopic {
    itemId: number;
    userId: number;
    topicId: number;
    type: string;
    createdAt: Date;
    repetitionNumber: number;
    easinessFactor: string;
    reviewInterval: number;
    lastReviewed: string | null;
    nextReview: string;
    status: string;
    step: number | null;
}

export type ICreateTopicBody = Pick<ITopic, 'name' | 'description'>;
export type ICreateTopicResponse = Pick<ITopic, 'topicId' | 'name' | 'description' | 'createdAt' | 'imageUrl'>;
export type IUpdateTopicBody = Pick<ITopic, 'name' | 'description'>;
export type IUpdateTopicResponse = Pick<ITopic, 'topicId' | 'name' | 'description' | 'imageUrl'>;

export type ICreateTopicInClassBody = Pick<ITopic, 'name' | 'description'>;
export type ICreateTopicInClassResponse = ICreateTopicResponse;
