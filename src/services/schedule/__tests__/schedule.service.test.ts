/* eslint-disable no-undef */
import { scheduleService } from '../schedule.service';
import { scheduleRepo } from '@/repositories/schedule/schedule.repo';
import { userRepository } from '@/repositories/user/user.repo';
import { ItemTrackingWithTopic } from '../types/schedule.index';
import { FreeTimeSlotDays } from '@/repositories/user/type';

// Mock dependencies
jest.mock('@/repositories/schedule/schedule.repo');
jest.mock('@/repositories/user/user.repo');
jest.mock('@/utils/date', () => {
    const actual = jest.requireActual('@/utils/date');
    return {
        ...actual,
        getSystemDate: () => new Date('2025-10-19T00:00:00.000Z'),
    };
});

describe('ScheduleService - generateRecommendSchedule', () => {
    const mockUserId = 1;
    const mockTimezone = 'Asia/Ho_Chi_Minh';
    const mockFromDate = '2025-10-10';
    const mockToDate = '2025-10-25';

    const defaultFreeTimeSlots: FreeTimeSlotDays = {
        Monday: [
            { startTime: '05:00', endTime: '06:00' },
            { startTime: '07:00', endTime: '11:30' },
            { startTime: '14:00', endTime: '17:00' },
            { startTime: '20:00', endTime: '22:00' },
        ],
        Tuesday: [
            { startTime: '07:30', endTime: '11:30' },
            { startTime: '14:00', endTime: '17:00' },
            { startTime: '19:30', endTime: '22:00' },
        ],
        Wednesday: [
            { startTime: '05:15', endTime: '06:30' },
            { startTime: '08:15', endTime: '11:15' },
            { startTime: '14:15', endTime: '17:30' },
            { startTime: '20:30', endTime: '22:30' },
        ],
        Thursday: [
            { startTime: '05:15', endTime: '06:00' },
            { startTime: '08:15', endTime: '10:00' },
            { startTime: '14:00', endTime: '17:35' },
            { startTime: '18:45', endTime: '22:30' },
        ],
        Friday: [
            { startTime: '09:15', endTime: '11:00' },
            { startTime: '13:45', endTime: '15:15' },
            { startTime: '17:45', endTime: '22:45' },
        ],
        Saturday: [
            { startTime: '07:30', endTime: '11:30' },
            { startTime: '13:45', endTime: '16:30' },
            { startTime: '20:15', endTime: '21:45' },
        ],
        Sunday: [
            { startTime: '05:00', endTime: '9:00' },
            { startTime: '14:00', endTime: '16:00' },
        ],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (userRepository.getFreeTimeSlots as jest.Mock).mockResolvedValue(defaultFreeTimeSlots);
    });

    describe('Case 1: Empty Item List', () => {
        it('should return empty schedule when no items are available', async () => {
            (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue([]);

            const result = await scheduleService.generateRecommendSchedule({
                userId: mockUserId,
                fromDate: mockFromDate,
                toDate: mockToDate,
                timezone: mockTimezone,
            });

            expect(result.schedules).toEqual({});
            expect(result.waitingTopics).toEqual([]);
            expect(result.statistics.totalItems).toBe(0);
            expect(result.statistics.scheduledItems).toBe(0);
            expect(result.statistics.efficiency).toBe(0);
        });
    });

    describe('Case 2: Small Number of Items (10 items)', () => {
        const mockItems: ItemTrackingWithTopic[] = Array.from({ length: 40 }, (_, i) => ({
            itemId: i + 1,
            userId: mockUserId,
            topicId: 101,
            type: 'flashcard',
            createdAt: new Date('2025-09-01'),
            repetitionNumber: 0,
            easinessFactor: '2.5',
            reviewInterval: 1,
            lastReviewed: null,
            nextReview: '2025-10-10T00:00:00.000Z',
            status: 'new',
            topicTitle: 'Algorithms - Sorting',
            topicDescription: 'Basics of sorting algorithms',
        }));

        it('should schedule all items when sufficient time is available', async () => {
            (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(mockItems);

            const result = await scheduleService.generateRecommendSchedule({
                userId: mockUserId,
                fromDate: mockFromDate,
                toDate: mockToDate,
                timezone: mockTimezone,
            });

            expect(result.statistics.totalItems).toBe(40);
            expect(result.statistics.scheduledItems).toBeGreaterThan(0);
            expect(result.statistics.efficiency).toBeGreaterThan(0);
            expect(Object.keys(result.schedules).length).toBeGreaterThan(0);
        });
    });

    describe('Case 3: Mixing Number of Items and All date', () => {
        const mockItems: ItemTrackingWithTopic[] = [
            // Day 1: 2025-10-10 (Friday)
            ...Array.from({ length: 20 }, (_, i) => ({
                itemId: i + 1,
                userId: mockUserId,
                topicId: 101,
                type: 'flashcard',
                createdAt: new Date('2025-09-01'),
                repetitionNumber: 0,
                easinessFactor: '2.5',
                reviewInterval: 1,
                lastReviewed: null,
                nextReview: '2025-10-10T00:00:00.000Z',
                status: 'new',
                topicTitle: 'Algorithms - Sorting',
                topicDescription: 'Basics of sorting algorithms',
            })),
            // Day 2: 2025-10-11 (Saturday)
            ...Array.from({ length: 4 }, (_, i) => ({
                itemId: i + 6,
                userId: mockUserId,
                topicId: 102,
                type: 'question',
                createdAt: new Date('2025-09-02'),
                repetitionNumber: 2,
                easinessFactor: '1.4',
                reviewInterval: 3,
                lastReviewed: '2025-10-06T10:00:00.000Z',
                nextReview: '2025-10-11T00:00:00.000Z',
                status: 'learning',
                topicTitle: 'Data Structures - Trees',
                topicDescription: 'Tree traversal',
            })),
            // Day 3: 2025-10-12 (Sunday)
            ...Array.from({ length: 50 }, (_, i) => ({
                itemId: i + 11,
                userId: mockUserId,
                topicId: 103,
                type: 'reading',
                createdAt: new Date('2025-09-03'),
                repetitionNumber: 1,
                easinessFactor: '3.0',
                reviewInterval: 2,
                lastReviewed: '2025-10-08T08:00:00.000Z',
                nextReview: '2025-10-12T00:00:00.000Z',
                status: 'review',
                topicTitle: 'Networking - HTTP',
                topicDescription: 'HTTP methods',
            })),
            // Day 4: 2025-10-13 (Monday)
            ...Array.from({ length: 15 }, (_, i) => ({
                itemId: i + 16,
                userId: mockUserId,
                topicId: 104,
                type: 'flashcard',
                createdAt: new Date('2025-09-04'),
                repetitionNumber: 3,
                easinessFactor: '2.2',
                reviewInterval: 5,
                lastReviewed: '2025-10-05T09:30:00.000Z',
                nextReview: '2025-10-13T00:00:00.000Z',
                status: 'review',
                topicTitle: 'Databases - SQL',
                topicDescription: 'Joins and indexes',
            })),
            // Day 5: 2025-10-14 (Tuesday)
            ...Array.from({ length: 100 }, (_, i) => ({
                itemId: i + 21,
                userId: mockUserId,
                topicId: 105,
                type: 'coding',
                createdAt: new Date('2025-09-05'),
                repetitionNumber: 0,
                easinessFactor: '2.8',
                reviewInterval: 1,
                lastReviewed: null,
                nextReview: '2025-10-14T00:00:00.000Z',
                status: 'relearning',
                topicTitle: 'JavaScript - Async',
                topicDescription: 'Promises and async/await',
            })),
            // Day 6: 2025-10-15 (Wednesday)
            ...Array.from({ length: 2 }, (_, i) => ({
                itemId: i + 26,
                userId: mockUserId,
                topicId: 106,
                type: 'question',
                createdAt: new Date('2025-09-06'),
                repetitionNumber: 1,
                easinessFactor: '1.6',
                reviewInterval: 2,
                lastReviewed: '2025-10-09T07:00:00.000Z',
                nextReview: '2025-10-15T00:00:00.000Z',
                status: 'learning',
                topicTitle: 'TypeScript - Generics',
                topicDescription: 'Generic types',
            })),
            // Day 7: 2025-10-16 (Thursday)
            ...Array.from({ length: 5 }, (_, i) => ({
                itemId: i + 31,
                userId: mockUserId,
                topicId: 107,
                type: 'reading',
                createdAt: new Date('2025-09-07'),
                repetitionNumber: 4,
                easinessFactor: '2.9',
                reviewInterval: 8,
                lastReviewed: '2025-10-04T10:00:00.000Z',
                nextReview: '2025-10-16T00:00:00.000Z',
                status: 'review',
                topicTitle: 'DevOps - Docker',
                topicDescription: 'Containers and images',
            })),
            // Day 8: 2025-10-17 (Friday)
            ...Array.from({ length: 30 }, (_, i) => ({
                itemId: i + 36,
                userId: mockUserId,
                topicId: 108,
                type: 'flashcard',
                createdAt: new Date('2025-09-08'),
                repetitionNumber: 0,
                easinessFactor: '2.5',
                reviewInterval: 1,
                lastReviewed: null,
                nextReview: '2025-10-17T00:00:00.000Z',
                status: 'new',
                topicTitle: 'System Design - Caching',
                topicDescription: 'Cache strategies',
            })),
        ];

        it('should distribute items across multiple days', async () => {
            (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(mockItems);

            const result = await scheduleService.generateRecommendSchedule({
                userId: mockUserId,
                fromDate: mockFromDate,
                toDate: mockToDate,
                timezone: mockTimezone,
            });

            expect(result.statistics.totalItems).toBe(40);
            expect(Object.keys(result.schedules).length).toBeGreaterThan(1);
            expect(result.statistics.slotsGenerated).toBeGreaterThan(0);
        });
    });

    describe('Case 4: Mixed Difficulty Levels', () => {
        const mockItems: ItemTrackingWithTopic[] = [
            // Easy items (easinessFactor >= 2.8)
            ...Array.from({ length: 5 }, (_, i) => ({
                itemId: i + 1,
                userId: mockUserId,
                topicId: 101,
                type: 'flashcard',
                createdAt: new Date('2025-09-01'),
                repetitionNumber: 0,
                easinessFactor: '3.0',
                reviewInterval: 1,
                lastReviewed: null,
                nextReview: '2025-10-15T00:00:00.000Z',
                status: 'new',
                topicTitle: 'Easy Topic',
                topicDescription: 'Easy content',
            })),
            // Medium items (1.6 - 2.7)
            ...Array.from({ length: 5 }, (_, i) => ({
                itemId: i + 6,
                userId: mockUserId,
                topicId: 102,
                type: 'question',
                createdAt: new Date('2025-09-02'),
                repetitionNumber: 2,
                easinessFactor: '1.8',
                reviewInterval: 3,
                lastReviewed: '2025-10-10T10:00:00.000Z',
                nextReview: '2025-10-15T00:00:00.000Z',
                status: 'learning',
                topicTitle: 'Medium Topic',
                topicDescription: 'Medium content',
            })),
            // Hard items (easinessFactor <= 1.5)
            ...Array.from({ length: 5 }, (_, i) => ({
                itemId: i + 11,
                userId: mockUserId,
                topicId: 103,
                type: 'coding',
                createdAt: new Date('2025-09-03'),
                repetitionNumber: 4,
                easinessFactor: '1.3',
                reviewInterval: 5,
                lastReviewed: '2025-10-08T08:00:00.000Z',
                nextReview: '2025-10-15T00:00:00.000Z',
                status: 'review',
                topicTitle: 'Hard Topic',
                topicDescription: 'Hard content',
            })),
        ];

        it('should prioritize harder items (lower easiness factor)', async () => {
            (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(mockItems);

            const result = await scheduleService.generateRecommendSchedule({
                userId: mockUserId,
                fromDate: mockFromDate,
                toDate: mockToDate,
                timezone: mockTimezone,
            });

            expect(result.statistics.totalItems).toBe(15);
            expect(result.statistics.scheduledItems).toBeGreaterThan(0);

            // Verify that schedules contain items
            const allScheduledItems = Object.values(result.schedules).flat();
            expect(allScheduledItems.length).toBeGreaterThan(0);
        });
    });

    fdescribe('Case 5: Different Status Types (new, learning, review)', () => {
        const mockItems: ItemTrackingWithTopic[] = [
            ...Array.from({ length: 5 }, (_, i) => ({
                itemId: i + 1,
                userId: mockUserId,
                topicId: 101,
                type: 'flashcard',
                createdAt: new Date('2025-09-01'),
                repetitionNumber: 0,
                easinessFactor: '2.5',
                reviewInterval: 1,
                lastReviewed: null,
                nextReview: '2025-10-13T00:00:00.000Z',
                status: 'new',
                topicTitle: 'New Topic',
                topicDescription: 'New content',
            })),
            ...Array.from({ length: 15 }, (_, i) => ({
                itemId: i + 1,
                userId: mockUserId,
                topicId: 101,
                type: 'flashcard',
                createdAt: new Date('2025-09-01'),
                repetitionNumber: 0,
                easinessFactor: (1.3 + Math.random() * (2.5 - 1.3)).toFixed(2),
                reviewInterval: 1,
                lastReviewed: null,
                nextReview: '2025-10-13T00:00:00.000Z',
                status: 'relearning',
                topicTitle: 'relearning Topic',
                topicDescription: 'relearning content',
            })),
            ...Array.from({ length: 5 }, (_, i) => ({
                itemId: i + 6,
                userId: mockUserId,
                topicId: 102,
                type: 'question',
                createdAt: new Date('2025-09-02'),
                repetitionNumber: 2,
                easinessFactor: (1.3 + Math.random() * (2.5 - 1.3)).toFixed(2),
                reviewInterval: 3,
                lastReviewed: '2025-10-08T10:00:00.000Z',
                nextReview: '2025-10-13T00:00:00.000Z',
                status: 'learning',
                topicTitle: 'Learning Topic',
                topicDescription: 'Learning content',
            })),
            ...Array.from({ length: 5 }, (_, i) => ({
                itemId: i + 11,
                userId: mockUserId,
                topicId: 103,
                type: 'reading',
                createdAt: new Date('2025-09-03'),
                repetitionNumber: 5,
                easinessFactor: (1.3 + Math.random() * (2.5 - 1.3)).toFixed(2),
                reviewInterval: 8,
                lastReviewed: '2025-10-01T08:00:00.000Z',
                nextReview: '2025-10-13T00:00:00.000Z',
                status: 'review',
                topicTitle: 'Review Topic',
                topicDescription: 'Review content',
            })),
            ...Array.from({ length: 15 }, (_, i) => ({
                itemId: i + 11,
                userId: mockUserId,
                topicId: 103,
                type: 'reading',
                createdAt: new Date('2025-09-03'),
                repetitionNumber: 5,
                easinessFactor: '2.5',
                reviewInterval: 8,
                lastReviewed: '2025-10-01T08:00:00.000Z',
                nextReview: '2025-10-13T00:00:00.000Z',
                status: 'new',
                topicTitle: 'New Topic',
                topicDescription: 'New content',
            })),
        ];

        it('should handle items with different status types', async () => {
            (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(mockItems);

            const result = await scheduleService.generateRecommendSchedule({
                userId: mockUserId,
                fromDate: mockFromDate,
                toDate: mockToDate,
                timezone: mockTimezone,
            });

            expect(result.statistics.totalItems).toBe(15);
            expect(result.statistics.scheduledItems).toBeGreaterThan(0);
        });
    });

    // describe('Case 6: Limited Free Time Slots', () => {
    //     const limitedFreeTime: FreeTimeSlotDays = {
    //         Monday: [{ startTime: '14:00', endTime: '15:00' }],
    //         Tuesday: [],
    //         Wednesday: [{ startTime: '19:00', endTime: '20:00' }],
    //         Thursday: [],
    //         Friday: [],
    //         Saturday: [],
    //         Sunday: [],
    //     };

    //     const mockItems: ItemTrackingWithTopic[] = Array.from({ length: 20 }, (_, i) => ({
    //         itemId: i + 1,
    //         userId: mockUserId,
    //         topicId: 101,
    //         type: 'flashcard',
    //         createdAt: new Date('2025-09-01'),
    //         repetitionNumber: 0,
    //         easinessFactor: 2.5,
    //         reviewInterval: 1,
    //         lastReviewed: null,
    //         nextReview: '2025-10-13T00:00:00.000Z',
    //         status: 'new',
    //         topicTitle: 'Topic',
    //         topicDescription: 'Content',
    //     }));

    //     it('should put unscheduled items in waiting queue when time is limited', async () => {
    //         (userRepository.getFreeTimeSlots as jest.Mock).mockResolvedValue(limitedFreeTime);
    //         (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(mockItems);

    //         const result = await scheduleService.generateRecommendSchedule({
    //             userId: mockUserId,
    //             fromDate: mockFromDate,
    //             toDate: mockToDate,
    //             timezone: mockTimezone,
    //         });

    //         expect(result.statistics.totalItems).toBe(20);
    //         expect(result.waitingTopics.length).toBeGreaterThan(0);
    //         expect(result.statistics.waitingItems).toBeGreaterThan(0);
    //         expect(result.statistics.efficiency).toBeLessThan(100);
    //     });
    // });

    // describe('Case 7: No Free Time Available', () => {
    //     const noFreeTime: FreeTimeSlotDays = {
    //         Monday: [],
    //         Tuesday: [],
    //         Wednesday: [],
    //         Thursday: [],
    //         Friday: [],
    //         Saturday: [],
    //         Sunday: [],
    //     };

    //     const mockItems: ItemTrackingWithTopic[] = Array.from({ length: 10 }, (_, i) => ({
    //         itemId: i + 1,
    //         userId: mockUserId,
    //         topicId: 101,
    //         type: 'flashcard',
    //         createdAt: new Date('2025-09-01'),
    //         repetitionNumber: 0,
    //         easinessFactor: '2.5',
    //         reviewInterval: 1,
    //         lastReviewed: null,
    //         nextReview: '2025-10-13T00:00:00.000Z',
    //         status: 'new',
    //         topicTitle: 'Topic',
    //         topicDescription: 'Content',
    //     }));

    //     it('should put all items in waiting queue when no free time is available', async () => {
    //         (userRepository.getFreeTimeSlots as jest.Mock).mockResolvedValue(noFreeTime);
    //         (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(mockItems);

    //         const result = await scheduleService.generateRecommendSchedule({
    //             userId: mockUserId,
    //             fromDate: mockFromDate,
    //             toDate: mockToDate,
    //             timezone: mockTimezone,
    //         });

    //         expect(result.statistics.totalItems).toBe(10);
    //         expect(result.statistics.scheduledItems).toBe(0);
    //         expect(result.statistics.waitingItems).toBe(10);
    //         expect(result.statistics.efficiency).toBe(0);
    //         expect(Object.keys(result.schedules).length).toBe(0);
    //     });
    // });

    // describe('Case 8: Multiple Topics Same Day', () => {
    //     const mockItems: ItemTrackingWithTopic[] = [
    //         ...Array.from({ length: 3 }, (_, i) => ({
    //             itemId: i + 1,
    //             userId: mockUserId,
    //             topicId: 101,
    //             type: 'flashcard',
    //             createdAt: new Date('2025-09-01'),
    //             repetitionNumber: 0,
    //             easinessFactor: '2.5',
    //             reviewInterval: 1,
    //             lastReviewed: null,
    //             nextReview: '2025-10-13T00:00:00.000Z',
    //             status: 'new',
    //             topicTitle: 'Topic A',
    //             topicDescription: 'Topic A content',
    //         })),
    //         ...Array.from({ length: 3 }, (_, i) => ({
    //             itemId: i + 4,
    //             userId: mockUserId,
    //             topicId: 102,
    //             type: 'question',
    //             createdAt: new Date('2025-09-02'),
    //             repetitionNumber: 1,
    //             easinessFactor: '2.0',
    //             reviewInterval: 2,
    //             lastReviewed: '2025-10-10T10:00:00.000Z',
    //             nextReview: '2025-10-13T00:00:00.000Z',
    //             status: 'learning',
    //             topicTitle: 'Topic B',
    //             topicDescription: 'Topic B content',
    //         })),
    //         ...Array.from({ length: 3 }, (_, i) => ({
    //             itemId: i + 7,
    //             userId: mockUserId,
    //             topicId: 103,
    //             type: 'reading',
    //             createdAt: new Date('2025-09-03'),
    //             repetitionNumber: 3,
    //             easinessFactor: '1.8',
    //             reviewInterval: 5,
    //             lastReviewed: '2025-10-05T08:00:00.000Z',
    //             nextReview: '2025-10-13T00:00:00.000Z',
    //             status: 'review',
    //             topicTitle: 'Topic C',
    //             topicDescription: 'Topic C content',
    //         })),
    //     ];

    //     it('should group and schedule multiple topics on the same day', async () => {
    //         (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(mockItems);

    //         const result = await scheduleService.generateRecommendSchedule({
    //             userId: mockUserId,
    //             fromDate: mockFromDate,
    //             toDate: mockToDate,
    //             timezone: mockTimezone,
    //         });

    //         expect(result.statistics.totalItems).toBe(9);
    //         expect(result.statistics.scheduledItems).toBeGreaterThan(0);

    //         // Check that schedules are created
    //         const scheduleDates = Object.keys(result.schedules);
    //         expect(scheduleDates.length).toBeGreaterThan(0);
    //     });
    // });

    // describe('Case 9: Overdue Items (Past Review Date)', () => {
    //     const mockItems: ItemTrackingWithTopic[] = Array.from({ length: 10 }, (_, i) => ({
    //         itemId: i + 1,
    //         userId: mockUserId,
    //         topicId: 101,
    //         type: 'flashcard',
    //         createdAt: new Date('2025-08-01'),
    //         repetitionNumber: 3,
    //         easinessFactor: 1.8,
    //         reviewInterval: 5,
    //         lastReviewed: '2025-09-01T10:00:00.000Z',
    //         nextReview: '2025-10-05T00:00:00.000Z', // Overdue
    //         status: 'review',
    //         topicTitle: 'Overdue Topic',
    //         topicDescription: 'Overdue content',
    //     }));

    //     it('should prioritize overdue items higher', async () => {
    //         (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(mockItems);

    //         const result = await scheduleService.generateRecommendSchedule({
    //             userId: mockUserId,
    //             fromDate: mockFromDate,
    //             toDate: mockToDate,
    //             timezone: mockTimezone,
    //         });

    //         expect(result.statistics.totalItems).toBe(10);
    //         expect(result.statistics.scheduledItems).toBeGreaterThan(0);
    //     });
    // });

    // describe('Case 10: Custom Free Time Preferences', () => {
    //     const customFreeTime: FreeTimeSlotDays = {
    //         Monday: [{ startTime: '18:00', endTime: '22:00' }],
    //         Tuesday: [{ startTime: '18:00', endTime: '22:00' }],
    //         Wednesday: [{ startTime: '18:00', endTime: '22:00' }],
    //         Thursday: [{ startTime: '18:00', endTime: '22:00' }],
    //         Friday: [{ startTime: '18:00', endTime: '23:00' }],
    //         Saturday: [
    //             { startTime: '08:00', endTime: '12:00' },
    //             { startTime: '14:00', endTime: '20:00' },
    //         ],
    //         Sunday: [
    //             { startTime: '08:00', endTime: '12:00' },
    //             { startTime: '14:00', endTime: '20:00' },
    //         ],
    //     };

    //     const mockItems: ItemTrackingWithTopic[] = Array.from({ length: 30 }, (_, i) => {
    //         const dayOffset = Math.floor(i / 5);
    //         const baseDate = new Date('2025-10-10');
    //         baseDate.setDate(baseDate.getDate() + dayOffset);

    //         return {
    //             itemId: i + 1,
    //             userId: mockUserId,
    //             topicId: 101 + Math.floor(i / 5),
    //             type: ['flashcard', 'question', 'reading'][i % 3],
    //             createdAt: new Date('2025-09-01'),
    //             repetitionNumber: i % 4,
    //             easinessFactor: (2.0 + (i % 10) * 0.1).toString(),
    //             reviewInterval: 1 + (i % 5),
    //             lastReviewed: i % 3 === 0 ? null : '2025-10-05T10:00:00.000Z',
    //             nextReview: baseDate.toISOString(),
    //             status: ['new', 'learning', 'review'][i % 3],
    //             topicTitle: `Topic ${101 + Math.floor(i / 5)}`,
    //             topicDescription: `Description ${i + 1}`,
    //         };
    //     });

    //     it('should respect custom user free time preferences', async () => {
    //         (userRepository.getFreeTimeSlots as jest.Mock).mockResolvedValue(customFreeTime);
    //         (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(mockItems);

    //         const result = await scheduleService.generateRecommendSchedule({
    //             userId: mockUserId,
    //             fromDate: mockFromDate,
    //             toDate: mockToDate,
    //             timezone: mockTimezone,
    //         });

    //         expect(result.statistics.totalItems).toBe(30);
    //         expect(result.statistics.scheduledItems).toBeGreaterThan(0);

    //         // Verify time slots match user preferences
    //         Object.values(result.schedules).forEach(daySchedule => {
    //             daySchedule.forEach(slot => {
    //                 const startHour = new Date(slot.startTime).getHours();
    //                 // Most slots should be in evening/weekend based on custom preferences
    //                 expect(startHour).toBeDefined();
    //             });
    //         });
    //     });
    // });

    // describe('Case 11: Edge Case - Very Short Time Slots', () => {
    //     const shortFreeTime: FreeTimeSlotDays = {
    //         Monday: [
    //             { startTime: '14:00', endTime: '14:15' },
    //             { startTime: '16:00', endTime: '16:20' },
    //         ],
    //         Tuesday: [{ startTime: '10:00', endTime: '10:25' }],
    //         Wednesday: [],
    //         Thursday: [],
    //         Friday: [],
    //         Saturday: [],
    //         Sunday: [],
    //     };

    //     const mockItems: ItemTrackingWithTopic[] = Array.from({ length: 15 }, (_, i) => ({
    //         itemId: i + 1,
    //         userId: mockUserId,
    //         topicId: 101,
    //         type: 'flashcard',
    //         createdAt: new Date('2025-09-01'),
    //         repetitionNumber: 0,
    //         easinessFactor: 2.5,
    //         reviewInterval: 1,
    //         lastReviewed: null,
    //         nextReview: '2025-10-13T00:00:00.000Z',
    //         status: 'new',
    //         topicTitle: 'Topic',
    //         topicDescription: 'Content',
    //     }));

    //     it('should skip slots that are too short (< 30 minutes)', async () => {
    //         (userRepository.getFreeTimeSlots as jest.Mock).mockResolvedValue(shortFreeTime);
    //         (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(mockItems);

    //         const result = await scheduleService.generateRecommendSchedule({
    //             userId: mockUserId,
    //             fromDate: mockFromDate,
    //             toDate: mockToDate,
    //             timezone: mockTimezone,
    //         });

    //         expect(result.statistics.totalItems).toBe(15);
    //         // Most items should be in waiting queue due to short slots
    //         expect(result.statistics.waitingItems).toBeGreaterThan(0);
    //     });
    // });

    // describe('Case 12: Efficiency Calculation', () => {
    //     const mockItems: ItemTrackingWithTopic[] = Array.from({ length: 20 }, (_, i) => ({
    //         itemId: i + 1,
    //         userId: mockUserId,
    //         topicId: 101 + (i % 3),
    //         type: 'flashcard',
    //         createdAt: new Date('2025-09-01'),
    //         repetitionNumber: 0,
    //         easinessFactor: 2.5,
    //         reviewInterval: 1,
    //         lastReviewed: null,
    //         nextReview: '2025-10-13T00:00:00.000Z',
    //         status: 'new',
    //         topicTitle: `Topic ${101 + (i % 3)}`,
    //         topicDescription: 'Content',
    //     }));

    //     it('should calculate efficiency percentage correctly', async () => {
    //         (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(mockItems);

    //         const result = await scheduleService.generateRecommendSchedule({
    //             userId: mockUserId,
    //             fromDate: mockFromDate,
    //             toDate: mockToDate,
    //             timezone: mockTimezone,
    //         });

    //         expect(result.statistics.totalItems).toBe(20);
    //         expect(result.statistics.efficiency).toBeGreaterThanOrEqual(0);
    //         expect(result.statistics.efficiency).toBeLessThanOrEqual(100);

    //         // Verify efficiency formula
    //         const expectedEfficiency =
    //             result.statistics.totalItems > 0
    //                 ? (result.statistics.scheduledItems / result.statistics.totalItems) * 100
    //                 : 0;
    //         expect(result.statistics.efficiency).toBeCloseTo(expectedEfficiency, 2);

    //         // Verify item accounting
    //         expect(result.statistics.scheduledItems + result.statistics.waitingItems).toBe(
    //             result.statistics.totalItems
    //         );
    //     });
    // });

    // describe('Case 13: Same Topic Different Types', () => {
    //     const mockItems: ItemTrackingWithTopic[] = [
    //         ...Array.from({ length: 3 }, (_, i) => ({
    //             itemId: i + 1,
    //             userId: mockUserId,
    //             topicId: 101,
    //             type: 'flashcard',
    //             createdAt: new Date('2025-09-01'),
    //             repetitionNumber: 0,
    //             easinessFactor: '2.5',
    //             reviewInterval: 1,
    //             lastReviewed: null,
    //             nextReview: '2025-10-13T00:00:00.000Z',
    //             status: 'new',
    //             topicTitle: 'JavaScript',
    //             topicDescription: 'JavaScript fundamentals',
    //         })),
    //         ...Array.from({ length: 3 }, (_, i) => ({
    //             itemId: i + 4,
    //             userId: mockUserId,
    //             topicId: 101,
    //             type: 'question',
    //             createdAt: new Date('2025-09-01'),
    //             repetitionNumber: 0,
    //             easinessFactor: '2.5',
    //             reviewInterval: 1,
    //             lastReviewed: null,
    //             nextReview: '2025-10-13T00:00:00.000Z',
    //             status: 'new',
    //             topicTitle: 'JavaScript',
    //             topicDescription: 'JavaScript fundamentals',
    //         })),
    //         ...Array.from({ length: 3 }, (_, i) => ({
    //             itemId: i + 7,
    //             userId: mockUserId,
    //             topicId: 101,
    //             type: 'coding',
    //             createdAt: new Date('2025-09-01'),
    //             repetitionNumber: 0,
    //             easinessFactor: '2.5',
    //             reviewInterval: 1,
    //             lastReviewed: null,
    //             nextReview: '2025-10-13T00:00:00.000Z',
    //             status: 'new',
    //             topicTitle: 'JavaScript',
    //             topicDescription: 'JavaScript fundamentals',
    //         })),
    //     ];

    //     it('should group same topic with different types separately', async () => {
    //         (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(mockItems);

    //         const result = await scheduleService.generateRecommendSchedule({
    //             userId: mockUserId,
    //             fromDate: mockFromDate,
    //             toDate: mockToDate,
    //             timezone: mockTimezone,
    //         });

    //         expect(result.statistics.totalItems).toBe(9);
    //         expect(result.statistics.scheduledItems).toBeGreaterThan(0);
    //     });
    // });

    // describe('Case 14: Slots Generated Count', () => {
    //     const mockItems: ItemTrackingWithTopic[] = Array.from({ length: 25 }, (_, i) => {
    //         const dayOffset = Math.floor(i / 5);
    //         const baseDate = new Date('2025-10-13');
    //         baseDate.setDate(baseDate.getDate() + dayOffset);

    //         return {
    //             itemId: i + 1,
    //             userId: mockUserId,
    //             topicId: 101 + dayOffset,
    //             type: 'flashcard',
    //             createdAt: new Date('2025-09-01'),
    //             repetitionNumber: 0,
    //             easinessFactor: '2.5',
    //             reviewInterval: 1,
    //             lastReviewed: null,
    //             nextReview: baseDate.toISOString(),
    //             status: 'new',
    //             topicTitle: `Topic ${101 + dayOffset}`,
    //             topicDescription: 'Content',
    //         };
    //     });

    //     it('should correctly count the number of slots generated', async () => {
    //         (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(mockItems);

    //         const result = await scheduleService.generateRecommendSchedule({
    //             userId: mockUserId,
    //             fromDate: mockFromDate,
    //             toDate: mockToDate,
    //             timezone: mockTimezone,
    //         });

    //         expect(result.statistics.slotsGenerated).toBeDefined();
    //         expect(result.statistics.slotsGenerated).toBeGreaterThan(0);

    //         // Verify count matches actual schedules
    //         const actualSlotCount = Object.values(result.schedules).reduce((sum, slots) => sum + slots.length, 0);
    //         expect(result.statistics.slotsGenerated).toBe(actualSlotCount);
    //     });
    // });

    // describe('Case 15: Null/Undefined Free Time (Should Use Default)', () => {
    //     const mockItems: ItemTrackingWithTopic[] = Array.from({ length: 10 }, (_, i) => ({
    //         itemId: i + 1,
    //         userId: mockUserId,
    //         topicId: 101,
    //         type: 'flashcard',
    //         createdAt: new Date('2025-09-01'),
    //         repetitionNumber: 0,
    //         easinessFactor: '2.5',
    //         reviewInterval: 1,
    //         lastReviewed: null,
    //         nextReview: '2025-10-13T00:00:00.000Z',
    //         status: 'new',
    //         topicTitle: 'Topic',
    //         topicDescription: 'Content',
    //     }));

    //     it('should use default free time when user preferences are not set', async () => {
    //         (userRepository.getFreeTimeSlots as jest.Mock).mockResolvedValue(null);
    //         (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(mockItems);

    //         const result = await scheduleService.generateRecommendSchedule({
    //             userId: mockUserId,
    //             fromDate: mockFromDate,
    //             toDate: mockToDate,
    //             timezone: mockTimezone,
    //         });

    //         expect(result.statistics.totalItems).toBe(10);
    //         expect(result.statistics.scheduledItems).toBeGreaterThan(0);
    //         // Should use default free time and schedule items
    //     });
    // });
});
