export interface ITopic {
    topicId: number
    userId: number
    name: string
    description: string | null
    imageUrl?: string
    createdAt: Date
}

export type ITopicBasic = Pick<ITopic, 'topicId' | 'name' | 'description'>;
export type ITopicAdded = Pick<ITopic, 'userId' | 'name' | 'description'>;
export type ITopicUpdated = Pick<ITopic, 'name' | 'description'>;