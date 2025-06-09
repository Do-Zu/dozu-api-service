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
  topicTitle: string;
  topicDescription: string | null;
}
