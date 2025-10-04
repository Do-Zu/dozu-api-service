import { backlogRepo } from '@/repositories/backlog/backlog.repo';

class BacklogService {
  async count(userId: number, topicId: number) {
    return backlogRepo.countActiveByTopic(userId, topicId);
  }

  async add(userId: number, topicId: number, items: Array<{ flashcardId: number; source: any; sessionEpoch?: number; orderIndex?: number; }>) {
    return backlogRepo.addItems(userId, topicId, items);
  }

  async reserve(userId: number, topicId: number, limit: number, clientRequestId: string) {
    // Idempotent: if reserved with clientRequestId → return old set (enriched too)
    const existing = await backlogRepo.getReservedByClient(userId, topicId, clientRequestId);
    if (existing.length) return existing;
    return backlogRepo.reserve(userId, topicId, limit, clientRequestId);
  }

  async commit(userId: number, topicId: number, itemIds: number[]) {
    return backlogRepo.commit(userId, topicId, itemIds);
  }

  async release(userId: number, topicId: number, itemIds: number[]) {
    return backlogRepo.release(userId, topicId, itemIds);
  }

  async clear(userId: number, topicId: number, force?: boolean) {
    return backlogRepo.clear(userId, topicId, !!force);
  }
}

export const backlogService = new BacklogService();
