// import logger from '@/utils/logger';
import { scheduleRepo } from '@/repositories/schedule/schedule.repo';
import { FreeTimeSlotDays } from '@/repositories/user/type';
import { userRepository } from '@/repositories/user/user.repo';
import { ItemTrackingWithTopic } from './types';
import {
  convertMinuteToMillisecond,
  formatTimeToHHMM,
  getDateFormattedWithTimeZone,
  getDayOfWeek,
} from '@/utils/date';
import { SchedulePriorityQueue } from '@/utils/queue/schedule.queue';

export interface IScheduleTopicReview {
  topicId: number;
  topicTitle: string;
  topicDescription: string | null;
  reviewDate: Date;
  status: string;
  priority: number;
  type: string;
  startTime: Date;
  endTime: Date;
}

interface IGroupTopic {
  topicId: number;
  topicTitle: string;
  topicDescription: string | null;
  easinessFactor: string;
  reviewInterval: number;
  repetition: number;
  lastReviewed: string | null;
  reviewDate: Date;
  status: string;
  type: string;
}
interface IItemScheduleGenerated {
  topicId: number;
  priority: number;
  startTime: Date;
  endTime: Date;
  title: string;
  description: string | null;
  type: string;
  amountItem: number;
}

const DEFINE_DEFAULT_FREE_TIME: FreeTimeSlotDays = {
  Monday: [
    { startTime: '07:45', endTime: '12:30' },
    { startTime: '14:00', endTime: '15:45' },
  ],
  Tuesday: [{ startTime: '13:45', endTime: '16:30' }],
  Wednesday: [
    { startTime: '08:15', endTime: '10:15' },
    { startTime: '14:15', endTime: '14:45' },
    { startTime: '15:30', endTime: '16:30' },
  ],
  Thursday: [
    { startTime: '13:15', endTime: '14:00' },
    { startTime: '15:00', endTime: '17:15' },
    { startTime: '17:45', endTime: '22:30' },
  ],
  Friday: [
    { startTime: '13:45', endTime: '15:15' },
    { startTime: '17:45', endTime: '22:45' },
  ],
  Saturday: [
    { startTime: '10:00', endTime: '14:15' },
    { startTime: '13:45', endTime: '16:15' },
    { startTime: '20:15', endTime: '21:45' },
  ],
  Sunday: [],
};

const USER_PREFERRED_SESSION_LEARNING = 'morning';

/**
 * Service class for Schedule functionality
 */
class ScheduleService {
  private readonly DEFAULT_FREE_TIME: FreeTimeSlotDays = DEFINE_DEFAULT_FREE_TIME;
  private readonly DEFAULT_MINUTE_LEARN_FOR_EACH_ITEM = 1;
  private readonly DEFAULT_MINUTE_BREAK_TIME_FOR_EACH_SESSION = 5;
  /**
   * Retrieves the schedule for the current week.
   * @returns An array of time slots for the current week or an empty array if not implemented.
   */
  private async getFreeTimeSlots(userId: string) {
    return await userRepository.getFreeTimeSlots(userId);
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
    userId: string;
    fromDate: Date | string;
    toDate: Date | string;
    timezone: string;
  }) {
    const { userId, fromDate, toDate, timezone } = body;

    const fromDateString = getDateFormattedWithTimeZone(fromDate, timezone);
    const toDateString = getDateFormattedWithTimeZone(toDate, timezone);

    const listItemTracking: ItemTrackingWithTopic[] =
      await scheduleRepo.getListItemTrackingByUserIdInWeek(userId, fromDateString, toDateString);

    if (listItemTracking.length === 0) {
      return {
        schedules: [],
      };
    }

    //TODO: Should be get  user free time slots at DB layer
    //const userFreeTimeSlots = await this.getFreeTimeSlots(userId);
    // let freeTimeSlotPerDay = await this.getFreeTimeSlots(userId);

    // if (!freeTimeSlotPerDay || Object.keys(freeTimeSlotPerDay).length === 0) {
    //   freeTimeSlotPerDay = this.DEFAULT_FREE_TIME;
    // }

    let freeTimeSlotPerDay = this.DEFAULT_FREE_TIME;

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

    const scheduleGroupItemPerDate: Record<string, IGroupTopic[][]> = {};

    for (const date in scheduleMap) {
      const scheduleGroupTopic: Record<number, IGroupTopic[]> = {};

      for (const topicPerDate of scheduleMap[date]) {
        // Group by same topicId into array
        const { topicId } = topicPerDate;

        if (topicId === undefined) {
          continue;
        }

        if (!scheduleGroupTopic[topicId]) {
          scheduleGroupTopic[topicId] = [];
        }

        scheduleGroupTopic[topicId].push(topicPerDate as IGroupTopic);
      }

      if (!scheduleGroupItemPerDate[date]) {
        scheduleGroupItemPerDate[date] = [];
      }

      // For each date, we will have an array of grouped topics
      for (const topicId in scheduleGroupTopic) {
        const groupedTopics = scheduleGroupTopic[topicId];

        if (groupedTopics.length === 0) {
          continue;
        }

        scheduleGroupItemPerDate[date].push(groupedTopics);
      }

      const listGroupedItemByTopic = scheduleGroupItemPerDate[date];
      scheduleGroupItemPerDate[date] = [];

      for (const items of listGroupedItemByTopic) {
        const groupTopicsByMethod: Record<string, IGroupTopic[]> = {};

        for (const item of items) {
          if (!item.type) {
            continue;
          }

          if (!groupTopicsByMethod[item.type]) {
            groupTopicsByMethod[item.type] = [];
          }

          groupTopicsByMethod[item.type].push(item);
        }

        Object.values(groupTopicsByMethod).forEach(groupedItems => {
          if (groupedItems.length > 0) {
            scheduleGroupItemPerDate[date].push(groupedItems);
          }
        });
      }

      const tempScheduleGroupItemByMethod = scheduleGroupItemPerDate[date];
      scheduleGroupItemPerDate[date] = [];

      for (const items of tempScheduleGroupItemByMethod) {
        const arrayTopicsPerItemStatus: Record<string, IGroupTopic[]> = {};

        for (const item of items) {
          if (!item.status) {
            continue;
          }

          if (!arrayTopicsPerItemStatus[item.status]) {
            arrayTopicsPerItemStatus[item.status] = [];
          }

          arrayTopicsPerItemStatus[item.status].push(item);
        }

        // Convert the object to an array of grouped by status
        Object.values(arrayTopicsPerItemStatus).forEach(groupedItems => {
          if (groupedItems.length > 0) {
            scheduleGroupItemPerDate[date].push(groupedItems);
          }
        });
      }
    }

    const scheduleGenerateFollowFreeTimeSlotPerDay: Record<string, IItemScheduleGenerated[]> = {};

    const scheduleWaitingPriorityQueue = new SchedulePriorityQueue<IItemScheduleGenerated>(
      (topic1, topic2) => topic1.priority - topic2.priority
    );
    // Calculate priority and calculate how to push topic in schedule for each day

    for (const date in scheduleGroupItemPerDate) {
      const listItemGroupedPerDate = scheduleGroupItemPerDate[date];

      const dateOfWeek = getDayOfWeek(date);

      const listFreeTimeSlotsOfDay = freeTimeSlotPerDay[dateOfWeek];

      const schedulePriorityQueuePerDate = new SchedulePriorityQueue<IItemScheduleGenerated>(
        (topic1, topic2) => topic1.priority - topic2.priority
      );

      for (const items of listItemGroupedPerDate) {
        // Calculate priority based on status and easiness factor
        const easinessFactorSum = items.reduce(
          (sum, item) => sum + parseFloat(item.easinessFactor),
          0
        );

        const repetitionNumberSum = items.reduce((sum, item) => sum + (item.repetition ? 1 : 0), 0);

        // ------------------- Low Easiness Factor → High Priority -----------------
        // Lower easinessFactorSum = smaller numerator = higher priority
        // Items that are harder to remember get more attention
        // ------------------- High Repetition Count → Lower Priority -----------------
        // Higher repetitionNumberSum = larger denominator = lower priority
        // Items already reviewed many times get less attention
        //   ----------------- Edge Case Handling ------------------
        // 1 prevents division by zero when no items have repetitions
        // Ensures new items (with 0 repetitions) get appropriate priority
        //   ----------------- Status Consideration ------------------
        // New topics naturally get higher priority since they have lower repetition counts
        // The grouping by status earlier in the code ensures proper categorization
        // ES for new topic is usually 2.5 and repetition is 0 , so it will be handled correctly

        const priority = easinessFactorSum / (repetitionNumberSum || 1);

        const timeToLearn = items.length * (this.DEFAULT_MINUTE_LEARN_FOR_EACH_ITEM * 60 * 1000);

        const scheduleItem: IItemScheduleGenerated = {
          topicId: items[0].topicId,
          priority: priority,
          startTime: items[0].reviewDate, // Will be update for free time slot below
          endTime: new Date(items[0].reviewDate.getTime() + timeToLearn), // Will be update for free time slot below
          title: items[0].topicTitle,
          description: items[0]?.topicDescription,
          type: items[0].type,
          amountItem: items.length,
        };

        schedulePriorityQueuePerDate.enqueue(scheduleItem);
      }

      // Push all item of previous day that cannot be scheduled into the priority queue for this day
      // This is to ensure that if there are items that cannot be scheduled today, they will be considered for the next day
      while (!scheduleWaitingPriorityQueue.isEmpty()) {
        const waitingTopic = scheduleWaitingPriorityQueue.dequeue();
        if (!waitingTopic) {
          continue;
        }
        schedulePriorityQueuePerDate.enqueue(waitingTopic);
      }

      //TODO: Should be calculate how many topics assign for each slot is suitable per each day

      // Fill the schedule for the day based on free time slots
      for (const slot of listFreeTimeSlotsOfDay) {
        let startTime = new Date(`${date}T${slot.startTime}`);
        const endTime = new Date(`${date}T${slot.endTime}`);

        // Process all items in the priority queue for this time slot
        while (!schedulePriorityQueuePerDate.isEmpty()) {
          const highestPriorityTopicToLearn = schedulePriorityQueuePerDate.peek();

          if (!highestPriorityTopicToLearn) {
            break;
          }

          const minutesEstimateToStudy =
            highestPriorityTopicToLearn.amountItem * this.DEFAULT_MINUTE_LEARN_FOR_EACH_ITEM +
            this.DEFAULT_MINUTE_BREAK_TIME_FOR_EACH_SESSION;

          const timeAvailable = endTime.getTime() - startTime.getTime();
          const timeNeeded = convertMinuteToMillisecond(minutesEstimateToStudy);
          // If the item cannot fit in the current time slot, skip to the next item
          if (timeAvailable < timeNeeded) {
            let isFindSuitableSlot = false;

            // Find all free time slots that can fit the item
            for (const indexOfSlot in listFreeTimeSlotsOfDay) {
              const freeSlot = listFreeTimeSlotsOfDay[indexOfSlot];

              let freeStartTime = new Date(`${date}T${freeSlot.startTime}`);
              const freeEndTime = new Date(`${date}T${freeSlot.endTime}`);

              // If the item can fit in the free time slot, update the start and end time
              if (
                freeEndTime.getTime() - freeStartTime.getTime() >
                convertMinuteToMillisecond(minutesEstimateToStudy)
              ) {
                highestPriorityTopicToLearn.startTime = freeStartTime;
                highestPriorityTopicToLearn.endTime = new Date(
                  freeStartTime.getTime() + convertMinuteToMillisecond(minutesEstimateToStudy)
                );

                const slideStartTimeForAfterFillTopic = new Date(
                  freeStartTime.getTime() + convertMinuteToMillisecond(minutesEstimateToStudy)
                );

                listFreeTimeSlotsOfDay[indexOfSlot].startTime = formatTimeToHHMM(
                  slideStartTimeForAfterFillTopic
                );

                break;
              }
            }

            // If no suitable slot is found, add the item back to the waiting queue
            if (!isFindSuitableSlot) {
              scheduleWaitingPriorityQueue.enqueue(highestPriorityTopicToLearn);
            }

            schedulePriorityQueuePerDate.dequeue();
            continue;
          }

          // When the item can fit in the current time slot
          // Assign the time slot to the item
          highestPriorityTopicToLearn.startTime = startTime;
          highestPriorityTopicToLearn.endTime = new Date(startTime.getTime() + timeNeeded);

          // Slide the start time by the estimated study time plus break time
          const slidingStartTimeInSlot =
            startTime.getTime() +
            convertMinuteToMillisecond(minutesEstimateToStudy) +
            convertMinuteToMillisecond(this.DEFAULT_MINUTE_BREAK_TIME_FOR_EACH_SESSION);

          startTime = new Date(slidingStartTimeInSlot);

          // Add to the day's schedule
          if (!scheduleGenerateFollowFreeTimeSlotPerDay[date]) {
            scheduleGenerateFollowFreeTimeSlotPerDay[date] = [];
          }

          scheduleGenerateFollowFreeTimeSlotPerDay[date].push(highestPriorityTopicToLearn);

          schedulePriorityQueuePerDate.dequeue();
        }
      }

      // If there are still items left in the queue, they will not be scheduled for this day
      while (!schedulePriorityQueuePerDate.isEmpty()) {
        /**
         * This could be due to not enough free time slots or items that cannot fit in the available slot
         * Add to queue for waiting for fill the schedule for the next day
         */
        const waitingTopic = schedulePriorityQueuePerDate.dequeue();
        if (!waitingTopic) {
          continue;
        }
        scheduleWaitingPriorityQueue.enqueue(waitingTopic);
      }
    }

    // If there are still items left in the waiting queue, send to client and notify user
    const waitingTopics: IItemScheduleGenerated[] = [];

    while (!scheduleWaitingPriorityQueue.isEmpty()) {
      const waitingTopic = scheduleWaitingPriorityQueue.dequeue();
      if (waitingTopic) {
        waitingTopics.push(waitingTopic);
      }
    }

    return {
      schedules: scheduleGenerateFollowFreeTimeSlotPerDay,
      waitingTopics,
      preferredTime: USER_PREFERRED_SESSION_LEARNING,
    };
  }
}

export const scheduleService = new ScheduleService();
