export interface ITopic {
    topicId: number
    userId: number
    name: string
    description: string | null
    createdAt: Date
}

export type IBasicTopic = Pick<ITopic, 'topicId' | 'name' | 'description'> & { flashcardsCount?: number };