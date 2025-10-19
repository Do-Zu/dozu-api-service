import { scheduleRepo } from '@/repositories/schedule/schedule.repo';
import { FreeTimeSlotDays } from '@/repositories/user/type';
import { userRepository } from '@/repositories/user/user.repo';
import { IGroupTopic, IItemScheduleGenerated, ItemTrackingWithTopic } from './types/schedule.index';
import {
    formatTimeToHHMM,
    getDateFormatted,
    getDateFormattedWithTimeZone,
    getDayOfWeek,
    getSystemDate,
} from '@/utils/date';
import { SchedulePriorityQueue } from '@/utils/queue/schedule.queue';
import { BadRequest } from '@/core/error';
import { redisInstance as redis } from '@/libs/redis/default/redisDefault';
import { addMinutes, differenceInDays, differenceInMinutes, isValid, parse, parseISO } from 'date-fns';

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
    private DEFAULT_MINUTE_LEARN_FOR_EASY_ITEM = 0.25;
    private DEFAULT_MINUTE_LEARN_FOR_MEDIUM_ITEM = 1;
    private DEFAULT_MINUTE_LEARN_FOR_HARD_ITEM = 2;

    // Minutes per item based on difficulty (easy, medium, hard)
    private LIST_MINUTE_LEARN_FOR_ITEM_BASED_ON_DIFFICULTY = [
        this.DEFAULT_MINUTE_LEARN_FOR_EASY_ITEM,
        this.DEFAULT_MINUTE_LEARN_FOR_MEDIUM_ITEM,
        this.DEFAULT_MINUTE_LEARN_FOR_HARD_ITEM,
    ];

    private DEFAULT_MINUTE_LEARN_FOR_EACH_ITEM = 1; // Average time to learn each item

    private DEFAULT_EXTRA_MINUTE_FOR_EACH_SESSION = 5;
    private DEFAULT_MINUTE_BREAK_TIME_BETWEEN_SLOT = 5;
    private MIN_ITEMS_PER_SLOT = 20;
    private MAX_ITEMS_PER_SLOT = 50;
    private MIN_SLOT_DURATION_MINUTES = 30; // Minimum time for a productive study session
    private REVIEW_PRIORITY_MULTIPLIER = 1.2; // Boost priority for review items
    private NEW_ITEM_PRIORITY_MULTIPLIER = 1.4; // Boost priority for new items

    private PRIORITY_STATUS_ITEM_LEARNING_TRACKING = { new: 1.0, learning: 0.8, relearning: 0.6, review: 0.4 }; // Max items in priority queue

    private readonly TTL_SCHEDULE = 60 * this.MIN_SLOT_DURATION_MINUTES;

    // Q&A: easinessFactor:  Easy >= 2.8 , Medium 1.6 - 2.7 , Hard <= 1.5
    private readonly DIFFICULTY_BASED_ON_EASINESS_FACTOR = { hard: 1.5, easy: 2.8 }; // Easy >= 2.8 , Medium 1.6 - 2.7 , Hard <= 1.5

    /** */
    private WEIGHT_STRATEGY = {
        OVERDUE: 0.45,
        DIFFICULTY: 0.3,
        STABILITY: 0.15,
        STATUS: 0.1,
    };

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
     * Gets recommended study sessions for the user.
     */
    public async generateRecommendSchedule(body: {
        userId: number;
        fromDate: Date | string;
        toDate: Date | string;
        timezone: string;
    }) {
        const { userId, fromDate, toDate, timezone } = body;

        const fromDateString = getDateFormattedWithTimeZone(fromDate, timezone);
        const toDateString = getDateFormattedWithTimeZone(toDate, timezone);

        const KEY_MEMCACHE_SCHEDULE_PERSONAL = `schedule-personal:${userId}:${fromDateString}:${toDateString}`;

        const cachedSchedule = await redis.get(KEY_MEMCACHE_SCHEDULE_PERSONAL);

        if (cachedSchedule) {
            return cachedSchedule;
        }

        const data = await this.generateSchedule({
            userId,
            fromDateString,
            toDateString,
            timezone,
        });

        if (data && data.schedules && Object.keys(data.schedules).length > 0) {
            await redis.set(KEY_MEMCACHE_SCHEDULE_PERSONAL, data, this.TTL_SCHEDULE);
        }

        return data;
    }

    /**
     * Updates a session schedule.
     * @param userId - The ID of the user
     * @param fromDate - The start date of the schedule
     * @param toDate - The end date of the schedule
     * @param timezone - The timezone of the user
     * @param updates - The batch list updates to apply to the session schedule
     */
    public async updateSessionSchedule({
        userId,
        fromDate,
        toDate,
        timezone,
        updates,
    }: {
        userId: number;
        fromDate: Date | string;
        toDate: Date | string;
        timezone: string;
        updates: Partial<IItemScheduleGenerated>[];
    }) {
        const fromDateString = getDateFormattedWithTimeZone(fromDate, timezone);
        const toDateString = getDateFormattedWithTimeZone(toDate, timezone);

        const KEY_MEMCACHE_SCHEDULE_PERSONAL = `schedule-personal:${userId}:${fromDateString}:${toDateString}`;

        //Store in mem-cache
        await redis.set(KEY_MEMCACHE_SCHEDULE_PERSONAL, updates, this.TTL_SCHEDULE);

        //TODO: Must update on DB

        return updates;
    }

    /**
     * Generates a schedule for the user based on their spaced repetition tracking data.
     * @param userId - The ID of the user for whom to generate the schedule.
     * @returns An object containing the schedules or an empty array if no tracking data is found.
     */
    private async generateSchedule(body: {
        userId: number;
        fromDateString: string;
        toDateString: string;
        timezone: string;
    }) {
        const { userId, fromDateString, toDateString } = body;

        const listItemTracking: ItemTrackingWithTopic[] = await scheduleRepo.getListItemTrackingByUserIdInWeek(
            userId,
            fromDateString,
            toDateString
        );

        if (listItemTracking.length === 0) {
            return {
                schedules: {},
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

            const date = getDateFormatted(item.nextReview);

            if (!scheduleMap[date]) {
                scheduleMap[date] = [];
            }

            scheduleMap[date].push({
                topicId: item?.topicId,
                topicTitle: item?.topicTitle,
                topicDescription: item?.topicDescription,
                lastReviewed: item?.lastReviewed,
                easinessFactor: item?.easinessFactor,
                reviewInterval: item?.reviewInterval,
                repetition: item?.repetitionNumber,
                reviewDate: parseISO(date),
                timeReview: formatTimeToHHMM(parseISO(date)),
                status: item?.status,
                type: item?.type,
            });
        }

        //Grouping strategy
        const scheduleGroupItemPerDate: Record<string, IGroupTopic[][]> = {};

        for (const date in scheduleMap) {
            const itemsForDate = scheduleMap[date];

            // Group by topic first
            const topicGroups: Record<number, IGroupTopic[]> = {};
            for (const item of itemsForDate) {
                if (!item.topicId) continue;

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

        const scheduleWaitingPriorityQueue = new SchedulePriorityQueue<IGroupTopic[]>(
            (topic1, topic2) => this.calculatePriority(topic2) - this.calculatePriority(topic1) // Higher priority first
        );

        const dailyPriorityQueue = new SchedulePriorityQueue<IItemScheduleGenerated>(
            (topic1, topic2) => topic2.priority - topic1.priority
        );

        let totalItems = 0;
        let scheduledItems = 0;

        for (const date in scheduleGroupItemPerDate) {
            const listItemGroupedPerDate = scheduleGroupItemPerDate[date];

            const dateOfWeek = getDayOfWeek(date);
            const listFreeTimeSlotsOfDay = [...(freeTimeSlotPerDay[dateOfWeek] ?? [])];

            // Add all items to waiting queue if no free time
            if (listFreeTimeSlotsOfDay.length === 0) {
                for (const items of listItemGroupedPerDate) {
                    totalItems += items.length;
                    scheduleWaitingPriorityQueue.enqueue(items);
                }
                continue;
            }

            // Calculate the total available time for all slots during the day
            let totalAvailableMinutes = listFreeTimeSlotsOfDay.reduce((sum, slot) => {
                const slotDate = parseISO(date);

                const start = parse(slot.startTime, 'HH:mm', slotDate);
                const end = parse(slot.endTime, 'HH:mm', slotDate);

                if (!isValid(start) || !isValid(end)) {
                    return sum;
                }

                return sum + differenceInMinutes(end, start);
            }, 0);

            // Add waiting items from previous days and process today's schedule
            while (!scheduleWaitingPriorityQueue.isEmpty()) {
                const waitingItem = scheduleWaitingPriorityQueue.dequeue();

                if (!waitingItem) continue;

                listItemGroupedPerDate.push(waitingItem);
            }

            listItemGroupedPerDate.sort(
                (topic1, topic2) => this.calculatePriority(topic2) - this.calculatePriority(topic1)
            );

            // Process items for this date
            for (const items of listItemGroupedPerDate) {
                totalItems += items.length;

                // Only process if we have viable time slots
                if (!this.isSlotViable(totalAvailableMinutes)) break;

                //  Chunking based on available time
                const { itemsPerSlot } = this.calculateOptimalItemsPerSlot(items, totalAvailableMinutes);

                //TODO: Check amount items per slot of this function
                const chunks = this.splitItemsIntoStudyChunks(items, itemsPerSlot);

                for (const chunk of chunks) {
                    if (!chunk || !chunk.length) continue;

                    const priority = this.calculatePriority(chunk);

                    const totalMinuteToLearn = this.calculateTimeToLearn({
                        items: chunk,
                        minute: this.DEFAULT_MINUTE_LEARN_FOR_EACH_ITEM,
                        breakTime: this.DEFAULT_EXTRA_MINUTE_FOR_EACH_SESSION,
                    });

                    const { topicId, reviewDate, topicDescription, type, topicTitle } = chunk.find(t => !!t.topicId)!;

                    const endTime = addMinutes(new Date(chunk[0]?.reviewDate), totalMinuteToLearn);

                    const scheduleItem: IItemScheduleGenerated = {
                        topicId,
                        priority,
                        startTime: reviewDate,
                        endTime,
                        title: topicTitle,
                        description: topicDescription,
                        type,
                        amountItem: chunk.length,
                    };

                    dailyPriorityQueue.enqueue(scheduleItem);

                    //Calculate the remaining minutes for the remaining study slots
                    totalAvailableMinutes -= totalMinuteToLearn;
                }
            }

            // Schedule items into available time slots
            const scheduledToday: IItemScheduleGenerated[] = [];
            const waitEvents: IItemScheduleGenerated[] = [];

            for (const slot of listFreeTimeSlotsOfDay) {
                const baseDate = parseISO(date);
                let slotStart = parse(slot.startTime, 'HH:mm', baseDate);
                const slotEnd = parse(slot.endTime, 'HH:mm', baseDate);
                const slotDurationMinutes = differenceInMinutes(slotEnd, slotStart);

                if (!this.isSlotViable(slotDurationMinutes)) {
                    continue; // Skip slots that are too short
                }

                // Fill this slot with highest priority items
                while (!dailyPriorityQueue.isEmpty()) {
                    const nextItem = dailyPriorityQueue.peek();

                    if (!nextItem) break;

                    // Time required for items in this slot
                    const itemDuration =
                        nextItem.endTime && nextItem.startTime
                            ? differenceInMinutes(nextItem.endTime, nextItem.startTime)
                            : 0;

                    if (itemDuration <= 0) {
                        // Invalid item duration, skip this item
                        dailyPriorityQueue.dequeue();
                        continue;
                    }

                    const availableTime = differenceInMinutes(slotEnd, slotStart);

                    // Can't fit this item in remaining slot time
                    if (availableTime < itemDuration) {
                        const events = dailyPriorityQueue.dequeue();
                        if (events) waitEvents.push(events);
                    }

                    // Schedule the item
                    const scheduledItem = dailyPriorityQueue.dequeue();

                    if (!scheduledItem) continue;

                    scheduledItem.startTime = slotStart;
                    scheduledItem.endTime = addMinutes(slotStart, itemDuration);

                    scheduledToday.push(scheduledItem);
                    scheduledItems += scheduledItem.amountItem;

                    // Update slot start time
                    slotStart = addMinutes(scheduledItem.endTime, this.DEFAULT_MINUTE_BREAK_TIME_BETWEEN_SLOT);
                }
            }

            if (scheduledToday.length > 0) {
                scheduleGenerateFollowFreeTimeSlotPerDay[date] = scheduledToday;
            }

            waitEvents.map(event => {
                dailyPriorityQueue.enqueue(event);
            });
        }

        /**
         * This could be due to not enough free time slots or items that cannot fit in the available slot
         * Add to queue for waiting for fill the schedule for the next day
         */
        const waitingTopics: IItemScheduleGenerated[] = [];

        while (!dailyPriorityQueue.isEmpty()) {
            const waitingTopic = dailyPriorityQueue.dequeue();

            if (waitingTopic) {
                waitingTopics.push(waitingTopic);
            }
        }

        const waitingItems = waitingTopics.reduce((sum, topic) => sum + topic.amountItem, 0);

        const efficiency = totalItems > 0 ? (scheduledItems / totalItems) * 100 : 0;

        const slotsGenerated = Object.values(scheduleGenerateFollowFreeTimeSlotPerDay).reduce(
            (sum, slots) => sum + slots.length,
            0
        );

        return {
            schedules: scheduleGenerateFollowFreeTimeSlotPerDay,
            waitingTopics,
            preferredTime: USER_PREFERRED_SESSION_LEARNING,
            statistics: {
                totalItems,
                scheduledItems,
                waitingItems,
                efficiency,
                slotsGenerated,
            },
        };
    }

    /**
     * Calculate total time to learn items
     * @param items - List of items to learn
     * @param minute - Base minutes per item
     * @param breakTime - Break time in minutes after session
     * @param minuteBasedOnDifficult - Array of minutes based on difficulty [easy, medium, hard]
     * @returns Total minutes needed to learn the items including breaks
     */
    private calculateTimeToLearn({
        items,
        breakTime,
    }: {
        items: IGroupTopic[];
        minute: number;
        breakTime: number;
    }): number {
        if (!items || items.length === 0) return 0;

        const estimatedMinutesPerItem = this.calculateMinuteForItemBasedDifficult(items);

        return estimatedMinutesPerItem + breakTime;
    }

    private calculateMinuteForItemBasedDifficult(items: IGroupTopic[]): number {
        return items.reduce((sum, item) => {
            const easiness = Number(item.easinessFactor);
            if (easiness <= this.DIFFICULTY_BASED_ON_EASINESS_FACTOR.hard) {
                return sum + this.LIST_MINUTE_LEARN_FOR_ITEM_BASED_ON_DIFFICULTY[2]; // Hard
            }
            if (easiness >= this.DIFFICULTY_BASED_ON_EASINESS_FACTOR.easy) {
                return sum + this.LIST_MINUTE_LEARN_FOR_ITEM_BASED_ON_DIFFICULTY[0]; // Easy
            }
            return sum + this.LIST_MINUTE_LEARN_FOR_ITEM_BASED_ON_DIFFICULTY[1]; // Medium
        }, 0);
    }

    /**
     * Calculate optimal items per slot based on difficulty and time available
     * Aim to balance number of items and difficulty
     */
    private calculateOptimalItemsPerSlot(
        items: IGroupTopic[],
        availableMinutes: number
    ): { itemsPerSlot: number; numberOfSlots: number } {
        const totalItems = items.length;

        const estimatedTotalMinutesPerItem = this.calculateMinuteForItemBasedDifficult(items);

        const averageMinutesPerItem = Math.round(estimatedTotalMinutesPerItem / totalItems);

        const sessionBudgetMinutes = this.MIN_SLOT_DURATION_MINUTES + this.DEFAULT_EXTRA_MINUTE_FOR_EACH_SESSION;

        const maxViableSlots = Math.max(1, Math.floor(availableMinutes / sessionBudgetMinutes));

        const totalLearningMinutes =
            estimatedTotalMinutesPerItem + maxViableSlots * this.DEFAULT_EXTRA_MINUTE_FOR_EACH_SESSION;

        const requiredSlots = Math.max(1, Math.ceil(totalLearningMinutes / sessionBudgetMinutes));
        const numberOfSlots = Math.max(1, Math.min(maxViableSlots, requiredSlots));

        let itemsPerSlot: number = Math.ceil(totalItems / numberOfSlots);

        const averageDifficulty = items.reduce((sum, item) => sum + Number(item.easinessFactor), 0) / totalItems;

        const rateItemForSlotForHardDifficulty = 0.8;
        const rateItemForSlotForEasyDifficulty = 1.2;

        if (averageDifficulty <= this.DIFFICULTY_BASED_ON_EASINESS_FACTOR.hard) {
            itemsPerSlot = Math.ceil(itemsPerSlot * rateItemForSlotForHardDifficulty);
        } else if (averageDifficulty >= this.DIFFICULTY_BASED_ON_EASINESS_FACTOR.easy) {
            itemsPerSlot = Math.ceil(itemsPerSlot * rateItemForSlotForEasyDifficulty);
        }

        const expectMinuteForSlot = availableMinutes / numberOfSlots;

        const minutesPerSlotBudget = Math.max(this.MIN_SLOT_DURATION_MINUTES, expectMinuteForSlot);

        const studyBudgetPerSlot = Math.max(0, minutesPerSlotBudget - this.DEFAULT_EXTRA_MINUTE_FOR_EACH_SESSION);

        const maxItemSupportedByTime = Math.max(
            this.MIN_ITEMS_PER_SLOT,
            Math.floor(studyBudgetPerSlot / averageMinutesPerItem)
        );

        itemsPerSlot = Math.max(this.MIN_ITEMS_PER_SLOT, Math.min(this.MAX_ITEMS_PER_SLOT, itemsPerSlot));
        itemsPerSlot = Math.min(itemsPerSlot, maxItemSupportedByTime);

        return { itemsPerSlot, numberOfSlots };
    }

    /**
     * Split items into optimal chunks for studying
     * Aim for mixed difficulty in each chunk
     * Ensure each chunk has at least targetItemsPerChunk
     * Try to keep chunks balanced in size
     * Avoid small chunks
     */
    private splitItemsIntoStudyChunks(items: IGroupTopic[], targetItemsPerChunk: number): IGroupTopic[][] {
        const chunks: IGroupTopic[][] = [];

        if (items.length <= targetItemsPerChunk) {
            return [items];
        }

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
            return Number(a.easinessFactor) - Number(b.easinessFactor);
        });

        // Minimum items to consider merging with last chunk

        const totalItems = sortedItems.length;
        // Split into chunks with mixed difficulty
        for (let index = 0; index < totalItems; index += targetItemsPerChunk) {
            const chunk = sortedItems.slice(index, index + targetItemsPerChunk);

            // Amount item matching target
            if (chunk.length === targetItemsPerChunk) {
                chunks.push(chunk);
                continue;
            }

            const remainItem = chunk.length;
            const lastChunk = chunks.length > 0 ? chunks[chunks.length - 1] : [];

            // Add remaining items to last chunk if it's too small
            if (remainItem < this.MIN_ITEMS_PER_SLOT) {
                lastChunk.push(...chunk);
            } else {
                chunks.push(chunk);
            }
        }

        return chunks;
    }

    /**
     * Calculate enhanced priority with weighting
     *      -------------- Low Easiness Factor → High Priority -----------------
            Lower easinessFactorSum = smaller numerator = higher priority
            Items that are harder to remember get more attention
            ------------------- High Repetition Count → Lower Priority -----------------
            Higher repetitionNumberSum = larger denominator = lower priority
            Items already reviewed many times get less attention
              ----------------- Edge Case Handling ------------------
            1 prevents division by zero when no items have repetitions
            Ensures new items (with 0 repetitions) get appropriate priority
            ----------------- Overdue Items Boost ------------------
            Overdue items get a priority boost since they are more urgent
            The boost is proportional to the fraction of overdue items in the group
            Ensures that if many items are overdue, they get prioritized more
              ----------------- Status Consideration ------------------

            New topics naturally get higher priority since they have lower repetition counts
            The grouping by status earlier in the code ensures proper categorization
            ES for new topic is usually 2.5 and repetition is 0 , so it will be handled correctly
     */
    private calculatePriority(items: IGroupTopic[]): number {
        const DAY_OF_WEEK = 7;
        const NORMALIZE_MIN = 1;
        const NORMALIZE_MAX = 0;

        const HIGH_EASY_FACTOR = 3.0;

        const scores = items?.map(item => {
            const next = new Date(item.reviewDate);
            const today = getSystemDate();
            const overdueDays = Math.max(NORMALIZE_MAX, differenceInDays(today, next));
            const overdueScore = Math.min(overdueDays / DAY_OF_WEEK, NORMALIZE_MIN); // normalize : max 7 due day = 1 point

            const difficultyScore = (HIGH_EASY_FACTOR - Number(item.easinessFactor)) / 2; // EF: 1.3-3/0 -> normalize to 0-1

            const stabilityScore = 1 / Math.log(item.reviewInterval + item.repetition + 2);

            const statusScore =
                this.PRIORITY_STATUS_ITEM_LEARNING_TRACKING[
                    item.status as keyof typeof this.PRIORITY_STATUS_ITEM_LEARNING_TRACKING
                ];

            const score =
                overdueScore * this.WEIGHT_STRATEGY.OVERDUE +
                difficultyScore * this.WEIGHT_STRATEGY.DIFFICULTY +
                stabilityScore * this.WEIGHT_STRATEGY.STABILITY +
                statusScore * this.WEIGHT_STRATEGY.STATUS;

            return {
                score,
                item,
            };
        });

        const meanPriority = scores.reduce((sum, item) => sum + item.score, 0) / (scores.length ?? 1);

        /**
         * TODO for medianPriority
         
            Assessing skewness/dispersion
            If mean is high but median is low → there are a few heavily overdue cards that pull up the average score,
            but most cards are not urgent.
            → “Unstable” list: there are some cards that are very important to learn, but not all of them.
                
            Example:
                
            List A: [0.1, 0.1, 0.1, 0.9, 0.9]
            mean = 0.42, median = 0.1 → most cards are not important
                
            Optimize interface or dynamic learning suggestions
            You can use medianPriority to:
                
            Suggest “only learn cards that exceed the median threshold”
                
            Estimate the level of uniformity in list difficulty
            →  split up a study session.
                
            Ensure fairness between uneven sets
            When the list is small, the mean is easily distorted if there are 1–2 cards with extremely high scores.
                
            Median gives more stable values, avoiding “outlier bias”.

         */

        // const sorted = scores.map(item => item.score).sort((a, b) => a - b);

        // const mid = Math.floor(sorted.length / 2);

        // const medianPriority = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

        return Number(meanPriority.toFixed(4));
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
