import { scheduleRepo } from '@/repositories/schedule/schedule.repo';
import { FreeTimeSlotDays } from '@/repositories/user/type';
import { userRepository } from '@/repositories/user/user.repo';
import { IGroupTopic, IItemScheduleGenerated, ItemTrackingWithTopic } from './types/schedule.index';
import { getDateFormattedWithTimeZone, getDayOfWeek } from '@/utils/date';
import { SchedulePriorityQueue } from '@/utils/queue/schedule.queue';
import { BadRequest } from '@/core/error';

const DEFINE_DEFAULT_FREE_TIME: FreeTimeSlotDays = {
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

const USER_PREFERRED_SESSION_LEARNING = 'morning';

/**
 * Service class for Schedule functionality
 */
class ScheduleService {
    private readonly DEFAULT_FREE_TIME: FreeTimeSlotDays = DEFINE_DEFAULT_FREE_TIME;
    private readonly DEFAULT_MINUTE_LEARN_FOR_EACH_ITEM = 1;
    private readonly DEFAULT_MINUTE_BREAK_TIME_FOR_EACH_SESSION = 5;
    private readonly MIN_ITEMS_PER_SLOT = 20;
    private readonly MAX_ITEMS_PER_SLOT = 50;
    private readonly MIN_SLOT_DURATION_MINUTES = 30; // Minimum time for a productive study session
    private readonly REVIEW_PRIORITY_MULTIPLIER = 1.5; // Boost priority for review items
    private readonly NEW_ITEM_PRIORITY_MULTIPLIER = 1.2; // Boost priority for new items
    private readonly PRIORITY_STATUS_ITEM_LEARNING_TRACKING = { new: 3, learning: 2, review: 1 }; // Max items in priority queue
    /**
     * Retrieves the schedule for the current week.
     * @returns An array of time slots for the current week or an empty array if not implemented.
     */
    private async getFreeTimeSlots(userId: number) {
        const freeTimes: FreeTimeSlotDays | null = await userRepository.getFreeTimeSlots(userId);
        if (!freeTimes) return DEFINE_DEFAULT_FREE_TIME;
        return freeTimes;
    }

    /**
     * Gets the schedule for the current week.
     * @returns An object containing the schedule for the week or null if not implemented.
     */
    public async getScheduleInWeek() {
        return null;
    }

    /**
     * Generates a schedule for the user based on their spaced repetition tracking data.
     * @param userId - The ID of the user for whom to generate the schedule.
     * @returns An object containing the schedules or an empty array if no tracking data is found.
     */
    public async generateSchedule(body: {
        userId: number;
        fromDate: Date | string;
        toDate: Date | string;
        timezone: string;
    }) {
        const { userId, fromDate, toDate, timezone } = body;

        const fromDateString = getDateFormattedWithTimeZone(fromDate, timezone);
        const toDateString = getDateFormattedWithTimeZone(toDate, timezone);

        const listItemTracking: ItemTrackingWithTopic[] = await scheduleRepo.getListItemTrackingByUserIdInWeek(
            userId,
            fromDateString,
            toDateString
        );

        if (listItemTracking.length === 0) {
            return {
                schedules: [],
                waitingTopics: [],
                preferredTime: USER_PREFERRED_SESSION_LEARNING,
                statistics: {
                    totalItems: 0,
                    scheduledItems: 0,
                    waitingItems: 0,
                    efficiency: 0,
                },
            };
        }

        const freeTimeSlotPerDay = await this.getFreeTimeSlots(userId);

        const scheduleMap: Record<string, IGroupTopic[]> = {};

        // Group items by nextReview date
        for (const item of listItemTracking) {
            if (!item.nextReview) {
                continue;
            }

            if (!scheduleMap[item.nextReview]) {
                scheduleMap[item.nextReview] = [];
            }

            scheduleMap[item.nextReview].push({
                topicId: item.topicId,
                topicTitle: item.topicTitle,
                topicDescription: item.topicDescription,
                lastReviewed: item.lastReviewed,
                easinessFactor: item.easinessFactor,
                reviewInterval: item.reviewInterval,
                repetition: item.repetitionNumber,
                reviewDate: new Date(item.nextReview),
                status: item.status,
                type: item.type,
            });
        }

        //Grouping strategy
        const scheduleGroupItemPerDate: Record<string, IGroupTopic[][]> = {};

        for (const date in scheduleMap) {
            const itemsForDate = scheduleMap[date];

            // Group by topic first
            const topicGroups: Record<number, IGroupTopic[]> = {};
            for (const item of itemsForDate) {
                if (item.topicId === undefined) continue;

                if (!topicGroups[item.topicId]) {
                    topicGroups[item.topicId] = [];
                }
                topicGroups[item.topicId].push(item);
            }

            // Further group by type and status within each topic
            const finalGroups: IGroupTopic[][] = [];

            for (const topicId in topicGroups) {
                const topicItems = topicGroups[topicId];

                // Group by type
                const typeGroups: Record<string, IGroupTopic[]> = {};
                for (const item of topicItems) {
                    if (!item.type) continue;

                    if (!typeGroups[item.type]) {
                        typeGroups[item.type] = [];
                    }
                    typeGroups[item.type].push(item);
                }

                // Further group by status within each type
                for (const type in typeGroups) {
                    const typeItems = typeGroups[type];
                    const statusGroups: Record<string, IGroupTopic[]> = {};

                    for (const item of typeItems) {
                        if (!item.status) continue;

                        if (!statusGroups[item.status]) {
                            statusGroups[item.status] = [];
                        }
                        statusGroups[item.status].push(item);
                    }

                    // Add each status group as a separate group
                    for (const status in statusGroups) {
                        const statusItems = statusGroups[status];
                        if (statusItems.length > 0) {
                            finalGroups.push(statusItems);
                        }
                    }
                }
            }

            scheduleGroupItemPerDate[date] = finalGroups;
        }

        const scheduleGenerateFollowFreeTimeSlotPerDay: Record<string, IItemScheduleGenerated[]> = {};
        const scheduleWaitingPriorityQueue = new SchedulePriorityQueue<IItemScheduleGenerated>(
            (topic1, topic2) => topic2.priority - topic1.priority // Higher priority first
        );

        let totalItems = 0;
        let scheduledItems = 0;

        // Enhanced scheduling algorithm
        for (const date in scheduleGroupItemPerDate) {
            const listItemGroupedPerDate = scheduleGroupItemPerDate[date];
            const dateOfWeek = getDayOfWeek(date);
            const listFreeTimeSlotsOfDay = [...freeTimeSlotPerDay[dateOfWeek]]; // Copy to avoid mutation

            if (listFreeTimeSlotsOfDay.length === 0) {
                // Add all items to waiting queue if no free time
                for (const items of listItemGroupedPerDate) {
                    totalItems += items.length;

                    const chunks = this.splitItemsIntoStudyChunks(items, this.MAX_ITEMS_PER_SLOT);
                    for (const chunk of chunks) {
                        const priority = this.calculatePriority(chunk);
                        const scheduleItem: IItemScheduleGenerated = {
                            topicId: chunk[0].topicId,
                            priority,
                            startTime: chunk[0].reviewDate,
                            endTime: new Date(chunk[0].reviewDate.getTime() + chunk.length * 60 * 1000),
                            title: chunk[0].topicTitle,
                            description: chunk[0].topicDescription,
                            type: chunk[0].type,
                            amountItem: chunk.length,
                        };
                        scheduleWaitingPriorityQueue.enqueue(scheduleItem);
                    }
                }
                continue;
            }

            const dailyPriorityQueue = new SchedulePriorityQueue<IItemScheduleGenerated>(
                (topic1, topic2) => topic2.priority - topic1.priority
            );

            // Process items for this date
            for (const items of listItemGroupedPerDate) {
                totalItems += items.length;

                // Calculate available time for the day
                const totalAvailableMinutes = listFreeTimeSlotsOfDay.reduce((sum, slot) => {
                    const start = new Date(`${date}T${slot.startTime}`);
                    const end = new Date(`${date}T${slot.endTime}`);
                    return sum + (end.getTime() - start.getTime()) / (60 * 1000);
                }, 0);

                // Only process if we have viable time slots
                if (!this.isSlotViable(totalAvailableMinutes)) {
                    const chunks = this.splitItemsIntoStudyChunks(items, this.MAX_ITEMS_PER_SLOT);
                    for (const chunk of chunks) {
                        const priority = this.calculatePriority(chunk);
                        const scheduleItem: IItemScheduleGenerated = {
                            topicId: chunk[0].topicId,
                            priority,
                            startTime: chunk[0].reviewDate,
                            endTime: new Date(chunk[0].reviewDate.getTime() + chunk.length * 60 * 1000),
                            title: chunk[0].topicTitle,
                            description: chunk[0].topicDescription,
                            type: chunk[0].type,
                            amountItem: chunk.length,
                        };
                        scheduleWaitingPriorityQueue.enqueue(scheduleItem);
                    }
                    continue;
                }

                // Smart chunking based on available time
                const { itemsPerSlot } = this.calculateOptimalItemsPerSlot(
                    items,
                    totalAvailableMinutes / listFreeTimeSlotsOfDay.length
                );
                const chunks = this.splitItemsIntoStudyChunks(items, itemsPerSlot);

                for (const chunk of chunks) {
                    const priority = this.calculatePriority(chunk);
                    const timeToLearn =
                        chunk.length * this.DEFAULT_MINUTE_LEARN_FOR_EACH_ITEM +
                        this.DEFAULT_MINUTE_BREAK_TIME_FOR_EACH_SESSION;

                    const scheduleItem: IItemScheduleGenerated = {
                        topicId: chunk[0].topicId,
                        priority,
                        startTime: chunk[0].reviewDate,
                        endTime: new Date(chunk[0].reviewDate.getTime() + timeToLearn * 60 * 1000),
                        title: chunk[0].topicTitle,
                        description: chunk[0].topicDescription,
                        type: chunk[0].type,
                        amountItem: chunk.length,
                    };

                    dailyPriorityQueue.enqueue(scheduleItem);
                }
            }

            // Add waiting items from previous days and process today's schedule
            while (!scheduleWaitingPriorityQueue.isEmpty()) {
                const waitingItem = scheduleWaitingPriorityQueue.dequeue();
                if (waitingItem) {
                    dailyPriorityQueue.enqueue(waitingItem);
                }
            }

            // Schedule items into available time slots
            const scheduledToday: IItemScheduleGenerated[] = [];

            for (const slot of listFreeTimeSlotsOfDay) {
                let slotStart = new Date(`${date}T${slot.startTime}`);
                const slotEnd = new Date(`${date}T${slot.endTime}`);
                const slotDurationMinutes = (slotEnd.getTime() - slotStart.getTime()) / (60 * 1000);

                if (!this.isSlotViable(slotDurationMinutes)) {
                    continue; // Skip slots that are too short
                }

                // Fill this slot with highest priority items
                while (!dailyPriorityQueue.isEmpty()) {
                    const nextItem = dailyPriorityQueue.peek();
                    if (!nextItem) break;

                    // Time required for items in this slot
                    const itemDuration =
                        nextItem.amountItem * this.DEFAULT_MINUTE_LEARN_FOR_EACH_ITEM +
                        this.DEFAULT_MINUTE_BREAK_TIME_FOR_EACH_SESSION;

                    const availableTime = (slotEnd.getTime() - slotStart.getTime()) / (60 * 1000);

                    if (availableTime < itemDuration) {
                        break; // Can't fit this item in remaining slot time
                    }

                    // Schedule the item
                    const scheduledItem = dailyPriorityQueue.dequeue()!;
                    scheduledItem.startTime = new Date(slotStart);
                    scheduledItem.endTime = new Date(slotStart.getTime() + itemDuration * 60 * 1000);

                    scheduledToday.push(scheduledItem);
                    scheduledItems += scheduledItem.amountItem;

                    // Update slot start time
                    slotStart = new Date(
                        scheduledItem.endTime.getTime() + this.DEFAULT_MINUTE_BREAK_TIME_FOR_EACH_SESSION * 60 * 1000
                    );
                }
            }

            if (scheduledToday.length > 0) {
                scheduleGenerateFollowFreeTimeSlotPerDay[date] = scheduledToday;
            }

            // Add unscheduled items back to waiting queue
            while (!dailyPriorityQueue.isEmpty()) {
                const unscheduledItem = dailyPriorityQueue.dequeue();
                if (unscheduledItem) {
                    scheduleWaitingPriorityQueue.enqueue(unscheduledItem);
                }
            }
        }

        /**
         * This could be due to not enough free time slots or items that cannot fit in the available slot
         * Add to queue for waiting for fill the schedule for the next day
         */
        const waitingTopics: IItemScheduleGenerated[] = [];
        while (!scheduleWaitingPriorityQueue.isEmpty()) {
            const waitingTopic = scheduleWaitingPriorityQueue.dequeue();
            if (waitingTopic) {
                waitingTopics.push(waitingTopic);
            }
        }

        const waitingItems = waitingTopics.reduce((sum, topic) => sum + topic.amountItem, 0);
        const efficiency = totalItems > 0 ? (scheduledItems / totalItems) * 100 : 0;

        return {
            schedules: scheduleGenerateFollowFreeTimeSlotPerDay,
            waitingTopics,
            preferredTime: USER_PREFERRED_SESSION_LEARNING,
            statistics: {
                totalItems,
                scheduledItems,
                waitingItems,
                efficiency: Math.round(efficiency * 100) / 100,
                slotsGenerated: Object.values(scheduleGenerateFollowFreeTimeSlotPerDay).reduce(
                    (sum, slots) => sum + slots.length,
                    0
                ),
                averageItemsPerSlot:
                    scheduledItems > 0
                        ? Math.round(
                              (scheduledItems /
                                  Object.values(scheduleGenerateFollowFreeTimeSlotPerDay).reduce(
                                      (sum, slots) => sum + slots.length,
                                      0
                                  )) *
                                  100
                          ) / 100
                        : 0,
            },
        };
    }

    /**
     * Calculate optimal items per slot based on difficulty and time available
     */
    private calculateOptimalItemsPerSlot(
        items: IGroupTopic[],
        availableMinutes: number
    ): { itemsPerSlot: number; numberOfSlots: number } {
        const totalItems = items.length;
        const averageDifficulty = items.reduce((sum, item) => sum + parseFloat(item.easinessFactor), 0) / totalItems;

        // Adjust items per slot based on difficulty (lower easiness = harder = fewer items per slot)
        let baseItemsPerSlot = Math.floor(availableMinutes / this.DEFAULT_MINUTE_LEARN_FOR_EACH_ITEM);

        // Apply difficulty adjustment
        if (averageDifficulty < 2.0) {
            baseItemsPerSlot = Math.min(baseItemsPerSlot * 0.7, this.MAX_ITEMS_PER_SLOT);
        } else if (averageDifficulty > 3.0) {
            baseItemsPerSlot = Math.min(baseItemsPerSlot * 1.2, this.MAX_ITEMS_PER_SLOT);
        }

        // Ensure within bounds
        const itemsPerSlot = Math.max(this.MIN_ITEMS_PER_SLOT, Math.min(this.MAX_ITEMS_PER_SLOT, baseItemsPerSlot));
        const numberOfSlots = Math.ceil(totalItems / itemsPerSlot);

        return { itemsPerSlot, numberOfSlots };
    }

    /**
     * Split items into optimal chunks for studying
     */
    private splitItemsIntoStudyChunks(items: IGroupTopic[], targetItemsPerChunk: number): IGroupTopic[][] {
        const chunks: IGroupTopic[][] = [];

        // Sort items by priority (new items first, then by difficulty)
        const sortedItems = [...items].sort((a, b) => {
            // Prioritize by status: new > learning > review
            const statusPriority = this.PRIORITY_STATUS_ITEM_LEARNING_TRACKING;
            const aStatusPriority = statusPriority[a.status as keyof typeof statusPriority] || 0;
            const bStatusPriority = statusPriority[b.status as keyof typeof statusPriority] || 0;

            if (aStatusPriority !== bStatusPriority) {
                return bStatusPriority - aStatusPriority;
            }

            // Then by difficulty (harder items first within same status)
            return parseFloat(a.easinessFactor) - parseFloat(b.easinessFactor);
        });

        // Split into chunks with mixed difficulty
        for (let i = 0; i < sortedItems.length; i += targetItemsPerChunk) {
            const chunk = sortedItems.slice(i, i + targetItemsPerChunk);
            if (chunk.length >= this.MIN_ITEMS_PER_SLOT || i + targetItemsPerChunk >= sortedItems.length) {
                chunks.push(chunk);
            } else {
                // Add remaining items to last chunk if it's too small
                if (chunks.length > 0) {
                    chunks[chunks.length - 1].push(...chunk);
                } else {
                    chunks.push(chunk);
                }
            }
        }

        return chunks;
    }

    /**
     * Calculate enhanced priority with smart weighting
     *      -------------- Low Easiness Factor → High Priority -----------------
            Lower easinessFactorSum = smaller numerator = higher priority
            Items that are harder to remember get more attention
            ------------------- High Repetition Count → Lower Priority -----------------
            Higher repetitionNumberSum = larger denominator = lower priority
            Items already reviewed many times get less attention
              ----------------- Edge Case Handling ------------------
            1 prevents division by zero when no items have repetitions
            Ensures new items (with 0 repetitions) get appropriate priority
              ----------------- Status Consideration ------------------
            New topics naturally get higher priority since they have lower repetition counts
            The grouping by status earlier in the code ensures proper categorization
            ES for new topic is usually 2.5 and repetition is 0 , so it will be handled correctly
     */
    private calculatePriority(items: IGroupTopic[]): number {
        const easinessFactorSum = items.reduce((sum, item) => sum + parseFloat(item.easinessFactor), 0);
        const repetitionNumberSum = items.reduce((sum, item) => sum + (item.repetition || 0), 0);

        // Base priority calculation
        let priority = easinessFactorSum / (repetitionNumberSum + 1);

        // Apply status-based multipliers
        const statusCounts = items.reduce(
            (acc, item) => {
                acc[item.status] = (acc[item.status] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        if (statusCounts['new'] > 0) {
            priority *= this.NEW_ITEM_PRIORITY_MULTIPLIER;
        }
        if (statusCounts['review'] > 0) {
            priority *= this.REVIEW_PRIORITY_MULTIPLIER;
        }

        // Boost priority for overdue items
        const now = new Date();
        const overdueCount = items.filter(item => item.reviewDate && new Date(item.reviewDate) < now).length;

        if (overdueCount > 0) {
            priority *= 1 + (overdueCount / items.length) * 0.5; // Up to 50% boost for overdue items
        }

        return priority;
    }

    /**
     * Check if a time slot can accommodate the minimum study session
     */
    private isSlotViable(slotDurationMinutes: number): boolean {
        return slotDurationMinutes >= this.MIN_SLOT_DURATION_MINUTES;
    }

    /**
     * Get user preferences for schedule
     * @returns User preferences for schedule
     */
    public async getPreferenceForSchedule({ userId }: { userId: number }) {
        const user = await userRepository.getUserById(userId);

        if (!user) {
            throw new BadRequest('User not found');
        }

        const { preferences, avgStudyDuration, freeTime, studyPreferences } = user;

        return {
            preferences,
            studyPreferences,
            avgStudyDuration,
            freeTime,
        };
    }

    /**
     * Batch update user preferences for schedule
     * @param param - Object containing userId and preferences
     * @param userId - The ID of the user
     * @return Updated user preferences
     */
    public async batchUpdatePreferenceForSchedule({
        userId,
        preferences,
    }: {
        userId: number;
        preferences: Partial<{
            studyPreferences: string[];
            avgStudyDuration: string | number;
            freeTime: FreeTimeSlotDays;
        }>;
    }) {
        const user = await userRepository.getUserById(userId);

        if (!user) {
            throw new BadRequest('User not found');
        }

        const update = await userRepository.batchUpdatePreferencesSchedule({
            userId,
            preferences,
        });

        return {
            preferences: update?.preferences,
            avgStudyDuration: update?.avgStudyDuration,
            freeTime: update?.freeTime as FreeTimeSlotDays,
        };
    }
}

export const scheduleService = new ScheduleService();
