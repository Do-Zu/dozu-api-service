export interface ITopic {
    topicId: number;
    name: string;
    description: string;
    createdAt: Date;

    // optional
    userId?: number;
    classId?: number | null;
    imageUrl?: string | null;
    flashcardCounts?: {
        total?: number;
        new?: number;
        learning?: number; // SM-2 algorithm
        dueToday?: number;
    }
    hasProgress?: boolean;
}

export type ICreateTopicBody = Pick<ITopic, 'name' | 'description'>;
export type ICreateTopicResponse = Pick<ITopic, 'topicId' | 'name' | 'description' | 'createdAt' | 'imageUrl'>;
export type IUpdateTopicBody = Pick<ITopic, 'name' | 'description'>;
export type IUpdateTopicResponse = Pick<ITopic, 'topicId' | 'name' | 'description' | 'imageUrl'>;

export type ICreateTopicInClassBody = Pick<ITopic, 'name' | 'description'>;
export type ICreateTopicInClassResponse = ICreateTopicResponse;
