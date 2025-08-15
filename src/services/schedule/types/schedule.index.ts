export interface ItemTrackingWithTopic {
    itemId: number;
    userId: number;
    topicId: number;
    type: string;
    createdAt: Date;
    repetitionNumber: number;
    easinessFactor: string;
    reviewInterval: number;
    lastReviewed: string | null;
    nextReview: string | null;
    status: string;
    topicTitle: string | null;
    topicDescription: string | null;
}
export interface IScheduleTopicReview {
    topicId: number;
    topicTitle: string | null;
    topicDescription: string | null;
    reviewDate: Date;
    status: string;
    priority: number;
    type: string;
    startTime: Date;
    endTime: Date;
}

export interface IGroupTopic {
    topicId: number;
    topicTitle: string | null;
    topicDescription: string | null;
    easinessFactor: string;
    reviewInterval: number;
    repetition: number;
    lastReviewed: string | null;
    reviewDate: Date;
    status: string;
    type: string;
}
export interface IItemScheduleGenerated {
    topicId: number;
    priority: number;
    startTime: Date;
    endTime: Date;
    title: string | null;
    description: string | null;
    type: string;
    amountItem: number;
}

export interface IScheduleStatistics {
    totalItems: number;
    scheduledItems: number;
    waitingItems: number;
    efficiency: number;
    slotsGenerated?: number;
    averageItemsPerSlot?: number;
}

export interface IScheduleResponse {
    schedules: Record<string, IItemScheduleGenerated[]>;
    waitingTopics: IItemScheduleGenerated[];
    preferredTime: string;
    statistics: IScheduleStatistics;
}
