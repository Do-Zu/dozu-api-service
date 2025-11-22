/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
import classTopicCommentService from '../classTopicComment.service';
import classTopicCommentRepo from '@/repositories/class-based-learning/classTopicComment.repo';
import { NotFoundError, BadRequest, DatabaseError } from '@/core/error';

// Mock dependencies
jest.mock('@/repositories/class-based-learning/classTopicComment.repo');
jest.mock('@/libs/drizzleClient.lib', () => ({
    transaction: jest.fn(callback => callback('mock-tx')),
}));

describe('ClassTopicCommentService', () => {
    const mockRepo = classTopicCommentRepo as jest.Mocked<typeof classTopicCommentRepo>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCommentById', () => {
        it('should return a comment when found', async () => {
            const mockComment = { commentId: 1, content: 'test' } as any;
            mockRepo.getCommentById.mockResolvedValue(mockComment);

            const result = await classTopicCommentService.getCommentById(1);

            expect(result).toEqual(mockComment);
            expect(mockRepo.getCommentById).toHaveBeenCalledWith(1);
        });

        it('should return undefined when not found', async () => {
            mockRepo.getCommentById.mockResolvedValue(undefined);

            const result = await classTopicCommentService.getCommentById(999);

            expect(result).toBeUndefined();
        });
    });

    describe('getCommentsByFilters', () => {
        it('should return filtered comments', async () => {
            const filters = { nodeId: '1', page: 1, limit: 10 };
            const mockComments = [{ commentId: 1 }] as any[];
            mockRepo.getCommentsByFilters.mockResolvedValue(mockComments);

            const result = await classTopicCommentService.getCommentsByFilters(filters);

            expect(result).toEqual(mockComments);
            expect(mockRepo.getCommentsByFilters).toHaveBeenCalledWith(filters);
        });
    });

    describe('getCommentsWithReplies', () => {
        it('should return comments with their replies', async () => {
            const nodeId = 'node-1';
            const typeNode = 'mindmap';
            const rootComments = [{ commentId: 1, content: 'root' }] as any[];
            const replies = [{ commentId: 2, parentCmtId: 1, content: 'reply' }] as any[];

            mockRepo.getRootCommentsByNode.mockResolvedValue(rootComments);
            mockRepo.getRepliesByParentId.mockResolvedValue(replies);

            const result = await classTopicCommentService.getCommentsWithReplies(nodeId, typeNode);

            expect(result).toHaveLength(1);
            expect(result[0].replies).toEqual(replies);
            expect(mockRepo.getRootCommentsByNode).toHaveBeenCalledWith(nodeId, typeNode);
            expect(mockRepo.getRepliesByParentId).toHaveBeenCalledWith(1);
        });
    });

    describe('createComment', () => {
        const baseData = {
            author: { user_id: 1 } as any,
            topicId: 1,
            content: 'test',
            nodeId: 'node-1',
            typeNode: 'mindmap',
        };

        it('should create a root comment successfully', async () => {
            const mockCreated = { commentId: 1, ...baseData, level: 0 } as any;
            mockRepo.createComment.mockResolvedValue(mockCreated);

            const result = await classTopicCommentService.createComment(baseData);

            expect(result).toEqual(mockCreated);
            expect(mockRepo.createComment).toHaveBeenCalledWith(expect.objectContaining({ level: 0 }), 'mock-tx');
        });

        it('should create a reply comment successfully', async () => {
            const replyData = { ...baseData, parentCmtId: 1 };
            const parentComment = { commentId: 1, level: 0 } as any;
            const mockCreated = { commentId: 2, ...replyData, level: 1 } as any;

            mockRepo.getCommentById.mockResolvedValue(parentComment);
            mockRepo.createComment.mockResolvedValue(mockCreated);

            const result = await classTopicCommentService.createComment(replyData);

            expect(result).toEqual(mockCreated);
            expect(mockRepo.getCommentById).toHaveBeenCalledWith(1, 'mock-tx');
            expect(mockRepo.createComment).toHaveBeenCalledWith(expect.objectContaining({ level: 1 }), 'mock-tx');
            expect(mockRepo.incrementReplyCount).toHaveBeenCalledWith(1, 'mock-tx');
        });

        it('should throw NotFoundError if parent comment not found', async () => {
            const replyData = { ...baseData, parentCmtId: 999 };
            mockRepo.getCommentById.mockResolvedValue(undefined);

            await expect(classTopicCommentService.createComment(replyData)).rejects.toThrow(NotFoundError);
        });

        it('should throw DatabaseError on repo failure', async () => {
            mockRepo.createComment.mockRejectedValue(new Error('DB Error'));

            await expect(classTopicCommentService.createComment(baseData)).rejects.toThrow(DatabaseError);
        });
    });

    describe('updateComment', () => {
        const updateData = { content: 'updated' };
        const userId = 1;

        it('should update comment successfully', async () => {
            const existing = { commentId: 1, author: { user_id: 1 } } as any;
            const updated = { ...existing, ...updateData };

            mockRepo.getCommentById.mockResolvedValue(existing);
            mockRepo.updateComment.mockResolvedValue(updated);

            const result = await classTopicCommentService.updateComment(1, userId, updateData);

            expect(result).toEqual(updated);
            expect(mockRepo.updateComment).toHaveBeenCalledWith(1, updateData);
        });

        it('should throw NotFoundError if comment does not exist', async () => {
            mockRepo.getCommentById.mockResolvedValue(undefined);

            await expect(classTopicCommentService.updateComment(1, userId, updateData)).rejects.toThrow(NotFoundError);
        });

        it('should throw BadRequest if user is not author', async () => {
            const existing = { commentId: 1, author: { user_id: 2 } } as any;
            mockRepo.getCommentById.mockResolvedValue(existing);

            await expect(classTopicCommentService.updateComment(1, userId, updateData)).rejects.toThrow(BadRequest);
        });
    });

    describe('deleteComment', () => {
        const userId = 1;

        it('should delete root comment successfully', async () => {
            const existing = { commentId: 1, author: { user_id: 1 }, parentCmtId: null } as any;
            mockRepo.getCommentById.mockResolvedValue(existing);

            await classTopicCommentService.deleteComment(1, userId);

            expect(mockRepo.softDeleteComment).toHaveBeenCalledWith(1);
            expect(mockRepo.decrementReplyCount).not.toHaveBeenCalled();
        });

        it('should delete reply comment and decrement parent count', async () => {
            const existing = { commentId: 2, author: { user_id: 1 }, parentCmtId: 1 } as any;
            mockRepo.getCommentById.mockResolvedValue(existing);

            await classTopicCommentService.deleteComment(2, userId);

            expect(mockRepo.softDeleteComment).toHaveBeenCalledWith(2);
            expect(mockRepo.decrementReplyCount).toHaveBeenCalledWith(1);
        });

        it('should throw NotFoundError if comment does not exist', async () => {
            mockRepo.getCommentById.mockResolvedValue(undefined);

            await expect(classTopicCommentService.deleteComment(1, userId)).rejects.toThrow(NotFoundError);
        });

        it('should throw BadRequest if user is not author', async () => {
            const existing = { commentId: 1, author: { user_id: 2 } } as any;
            mockRepo.getCommentById.mockResolvedValue(existing);

            await expect(classTopicCommentService.deleteComment(1, userId)).rejects.toThrow(BadRequest);
        });
    });

    describe('getCommentsByAuthor', () => {
        it('should return comments by author', async () => {
            const mockComments = [{ commentId: 1 }] as any[];
            mockRepo.getCommentsByAuthor.mockResolvedValue(mockComments);

            const result = await classTopicCommentService.getCommentsByAuthor(1);

            expect(result).toEqual(mockComments);
            expect(mockRepo.getCommentsByAuthor).toHaveBeenCalledWith(1);
        });
    });
});
