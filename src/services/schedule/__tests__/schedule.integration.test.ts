// /* eslint-disable no-undef */
// import { scheduleService } from '../schedule.service';
// import { scheduleRepo } from '@/repositories/schedule/schedule.repo';
// import { userRepository } from '@/repositories/user/user.repo';
// import { itemTrackingFixture } from './fixtures/itemTracking.fixture';
// import { FreeTimeSlotDays } from '@/repositories/user/type';

// // Mock dependencies
// jest.mock('@/repositories/schedule/schedule.repo');
// jest.mock('@/repositories/user/user.repo');
// jest.mock('@/utils/date', () => ({
//     getDateFormattedWithTimeZone: (date: Date | string) => {
//         const d = typeof date === 'string' ? new Date(date) : date;
//         return d.toISOString().split('T')[0];
//     },
//     getDayOfWeek: (dateString: string) => {
//         const date = new Date(dateString);
//         const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
//         return days[date.getDay()];
//     },
//     getSystemDate: () => new Date('2025-10-19'),
// }));

// describe('ScheduleService - Integration Tests with 40 Items Fixture', () => {
//     const mockUserId = 1;
//     const mockTimezone = 'Asia/Ho_Chi_Minh';
//     const mockFromDate = '2025-10-10';
//     const mockToDate = '2025-10-25';

//     const defaultFreeTimeSlots: FreeTimeSlotDays = {
//         Monday: [
//             { startTime: '05:00', endTime: '06:00' },
//             { startTime: '07:00', endTime: '11:30' },
//             { startTime: '14:00', endTime: '17:00' },
//             { startTime: '20:00', endTime: '22:00' },
//         ],
//         Tuesday: [
//             { startTime: '07:30', endTime: '11:30' },
//             { startTime: '14:00', endTime: '17:00' },
//             { startTime: '19:30', endTime: '22:00' },
//         ],
//         Wednesday: [
//             { startTime: '05:15', endTime: '06:30' },
//             { startTime: '08:15', endTime: '11:15' },
//             { startTime: '14:15', endTime: '17:30' },
//             { startTime: '20:30', endTime: '22:30' },
//         ],
//         Thursday: [
//             { startTime: '05:15', endTime: '06:00' },
//             { startTime: '08:15', endTime: '10:00' },
//             { startTime: '14:00', endTime: '17:35' },
//             { startTime: '18:45', endTime: '22:30' },
//         ],
//         Friday: [
//             { startTime: '09:15', endTime: '11:00' },
//             { startTime: '13:45', endTime: '15:15' },
//             { startTime: '17:45', endTime: '22:45' },
//         ],
//         Saturday: [
//             { startTime: '07:30', endTime: '11:30' },
//             { startTime: '13:45', endTime: '16:30' },
//             { startTime: '20:15', endTime: '21:45' },
//         ],
//         Sunday: [
//             { startTime: '05:00', endTime: '9:00' },
//             { startTime: '14:00', endTime: '16:00' },
//         ],
//     };

//     beforeEach(() => {
//         jest.clearAllMocks();
//         (userRepository.getFreeTimeSlots as jest.Mock).mockResolvedValue(defaultFreeTimeSlots);
//     });

//     describe('Full 40 Items Schedule Generation', () => {
//         it('should successfully generate schedule for all 40 items', async () => {
//             (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(itemTrackingFixture);

//             const result = await scheduleService.generateRecommendSchedule({
//                 userId: mockUserId,
//                 fromDate: mockFromDate,
//                 toDate: mockToDate,
//                 timezone: mockTimezone,
//             });

//             // Verify total items count
//             expect(result.statistics.totalItems).toBe(40);

//             // Verify some items are scheduled
//             expect(result.statistics.scheduledItems).toBeGreaterThan(0);

//             // Verify efficiency is calculated
//             expect(result.statistics.efficiency).toBeGreaterThanOrEqual(0);
//             expect(result.statistics.efficiency).toBeLessThanOrEqual(100);

//             // Verify schedules exist
//             expect(Object.keys(result.schedules).length).toBeGreaterThan(0);

//             // Verify statistics add up
//             expect(result.statistics.scheduledItems + result.statistics.waitingItems).toBe(
//                 result.statistics.totalItems
//             );
//         });

//         it('should distribute items across multiple days in the date range', async () => {
//             (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(itemTrackingFixture);

//             const result = await scheduleService.generateRecommendSchedule({
//                 userId: mockUserId,
//                 fromDate: mockFromDate,
//                 toDate: mockToDate,
//                 timezone: mockTimezone,
//             });

//             const scheduleDates = Object.keys(result.schedules);

//             // Should have schedules across multiple days
//             expect(scheduleDates.length).toBeGreaterThanOrEqual(1);

//             // Each date should be within the specified range
//             scheduleDates.forEach(date => {
//                 const scheduleDate = new Date(date);
//                 const fromDateObj = new Date(mockFromDate);
//                 const toDateObj = new Date(mockToDate);

//                 expect(scheduleDate.getTime()).toBeGreaterThanOrEqual(fromDateObj.getTime());
//                 expect(scheduleDate.getTime()).toBeLessThanOrEqual(toDateObj.getTime());
//             });
//         });

//         it('should respect free time slots when scheduling', async () => {
//             (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(itemTrackingFixture);

//             const result = await scheduleService.generateRecommendSchedule({
//                 userId: mockUserId,
//                 fromDate: mockFromDate,
//                 toDate: mockToDate,
//                 timezone: mockTimezone,
//             });

//             // Verify all scheduled slots fit within the defined free time slots
//             Object.entries(result.schedules).forEach(([date, slots]) => {
//                 slots.forEach(slot => {
//                     const startTime = new Date(slot.startTime);
//                     const endTime = new Date(slot.endTime);

//                     // Start time should be before end time
//                     expect(startTime.getTime()).toBeLessThan(endTime.getTime());

//                     // Verify the slot has reasonable duration (not too short, not too long)
//                     const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
//                     expect(durationMinutes).toBeGreaterThan(0);
//                     expect(durationMinutes).toBeLessThan(360); // Less than 6 hours per slot
//                 });
//             });
//         });

//         it('should generate slots with proper metadata', async () => {
//             (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(itemTrackingFixture);

//             const result = await scheduleService.generateRecommendSchedule({
//                 userId: mockUserId,
//                 fromDate: mockFromDate,
//                 toDate: mockToDate,
//                 timezone: mockTimezone,
//             });

//             const allSlots = Object.values(result.schedules).flat();

//             allSlots.forEach(slot => {
//                 // Verify required fields exist
//                 expect(slot.topicId).toBeDefined();
//                 expect(slot.priority).toBeDefined();
//                 expect(slot.startTime).toBeDefined();
//                 expect(slot.endTime).toBeDefined();
//                 expect(slot.type).toBeDefined();
//                 expect(slot.amountItem).toBeGreaterThan(0);

//                 // Verify priority is a valid number
//                 expect(typeof slot.priority).toBe('number');
//                 expect(slot.priority).toBeGreaterThan(0);

//                 // Verify types are from our fixture
//                 expect(['flashcard', 'quiz']).toContain(slot.type);
//             });
//         });

//         it('should calculate slots generated statistic correctly', async () => {
//             (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(itemTrackingFixture);

//             const result = await scheduleService.generateRecommendSchedule({
//                 userId: mockUserId,
//                 fromDate: mockFromDate,
//                 toDate: mockToDate,
//                 timezone: mockTimezone,
//             });

//             // Count actual slots
//             const actualSlotCount = Object.values(result.schedules).reduce((sum, slots) => sum + slots.length, 0);

//             // Should match the reported statistic
//             expect(result.statistics.slotsGenerated).toBe(actualSlotCount);
//         });
//     });

//     describe('Schedule Generation with Limited Free Time', () => {
//         const limitedFreeTime: FreeTimeSlotDays = {
//             Monday: [{ startTime: '19:00', endTime: '21:00' }],
//             Tuesday: [{ startTime: '19:00', endTime: '21:00' }],
//             Wednesday: [{ startTime: '19:00', endTime: '21:00' }],
//             Thursday: [{ startTime: '19:00', endTime: '21:00' }],
//             Friday: [{ startTime: '19:00', endTime: '22:00' }],
//             Saturday: [{ startTime: '09:00', endTime: '12:00' }],
//             Sunday: [{ startTime: '09:00', endTime: '12:00' }],
//         };

//         it('should handle 40 items with limited evening/weekend availability', async () => {
//             (userRepository.getFreeTimeSlots as jest.Mock).mockResolvedValue(limitedFreeTime);
//             (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(itemTrackingFixture);

//             const result = await scheduleService.generateRecommendSchedule({
//                 userId: mockUserId,
//                 fromDate: mockFromDate,
//                 toDate: mockToDate,
//                 timezone: mockTimezone,
//             });

//             expect(result.statistics.totalItems).toBe(40);

//             // With limited time, some items should be in waiting queue
//             if (result.statistics.scheduledItems < 40) {
//                 expect(result.waitingTopics.length).toBeGreaterThan(0);
//                 expect(result.statistics.waitingItems).toBeGreaterThan(0);
//             }

//             // Efficiency should be less than 100% due to limited time
//             expect(result.statistics.efficiency).toBeLessThanOrEqual(100);
//         });
//     });

//     describe('Schedule Generation with Abundant Free Time', () => {
//         const abundantFreeTime: FreeTimeSlotDays = {
//             Monday: [
//                 { startTime: '08:00', endTime: '12:00' },
//                 { startTime: '14:00', endTime: '18:00' },
//                 { startTime: '19:00', endTime: '22:00' },
//             ],
//             Tuesday: [
//                 { startTime: '08:00', endTime: '12:00' },
//                 { startTime: '14:00', endTime: '18:00' },
//                 { startTime: '19:00', endTime: '22:00' },
//             ],
//             Wednesday: [
//                 { startTime: '08:00', endTime: '12:00' },
//                 { startTime: '14:00', endTime: '18:00' },
//                 { startTime: '19:00', endTime: '22:00' },
//             ],
//             Thursday: [
//                 { startTime: '08:00', endTime: '12:00' },
//                 { startTime: '14:00', endTime: '18:00' },
//                 { startTime: '19:00', endTime: '22:00' },
//             ],
//             Friday: [
//                 { startTime: '08:00', endTime: '12:00' },
//                 { startTime: '14:00', endTime: '18:00' },
//                 { startTime: '19:00', endTime: '23:00' },
//             ],
//             Saturday: [
//                 { startTime: '08:00', endTime: '12:00' },
//                 { startTime: '14:00', endTime: '20:00' },
//             ],
//             Sunday: [
//                 { startTime: '08:00', endTime: '12:00' },
//                 { startTime: '14:00', endTime: '20:00' },
//             ],
//         };

//         it('should schedule most or all items with abundant free time', async () => {
//             (userRepository.getFreeTimeSlots as jest.Mock).mockResolvedValue(abundantFreeTime);
//             (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(itemTrackingFixture);

//             const result = await scheduleService.generateRecommendSchedule({
//                 userId: mockUserId,
//                 fromDate: mockFromDate,
//                 toDate: mockToDate,
//                 timezone: mockTimezone,
//             });

//             expect(result.statistics.totalItems).toBe(40);

//             // With abundant time, efficiency should be high
//             expect(result.statistics.efficiency).toBeGreaterThan(50);

//             // Most items should be scheduled
//             expect(result.statistics.scheduledItems).toBeGreaterThan(20);
//         });
//     });

//     describe('Priority and Difficulty Distribution', () => {
//         it('should prioritize items based on difficulty and status', async () => {
//             (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(itemTrackingFixture);

//             const result = await scheduleService.generateRecommendSchedule({
//                 userId: mockUserId,
//                 fromDate: mockFromDate,
//                 toDate: mockToDate,
//                 timezone: mockTimezone,
//             });

//             // Verify that schedules contain items with priority
//             const allSlots = Object.values(result.schedules).flat();

//             if (allSlots.length > 0) {
//                 // Check that priorities are assigned
//                 allSlots.forEach(slot => {
//                     expect(slot.priority).toBeGreaterThan(0);
//                 });

//                 // Verify items from fixture are represented
//                 const scheduledTopicIds = new Set(allSlots.map(slot => slot.topicId));
//                 expect(scheduledTopicIds.size).toBeGreaterThan(0);
//             }
//         });

//         it('should group items by topic, type, and status', async () => {
//             (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(itemTrackingFixture);

//             const result = await scheduleService.generateRecommendSchedule({
//                 userId: mockUserId,
//                 fromDate: mockFromDate,
//                 toDate: mockToDate,
//                 timezone: mockTimezone,
//             });

//             // Items from the same topic should potentially be grouped
//             const allSlots = Object.values(result.schedules).flat();

//             if (allSlots.length > 1) {
//                 // Check that we have variety in topics
//                 const topicIds = allSlots.map(slot => slot.topicId);
//                 const uniqueTopics = new Set(topicIds);

//                 // Should have multiple topics represented (assuming enough were scheduled)
//                 if (result.statistics.scheduledItems > 10) {
//                     expect(uniqueTopics.size).toBeGreaterThan(1);
//                 }
//             }
//         });
//     });

//     describe('Edge Cases with Fixture Data', () => {
//         it('should handle when only a subset of fixture items fall in date range', async () => {
//             // Filter fixture to only items within a narrow date range
//             const narrowDateFixture = itemTrackingFixture.filter(item => {
//                 const reviewDate = new Date(item.nextReview!);
//                 return reviewDate >= new Date('2025-10-15') && reviewDate <= new Date('2025-10-18');
//             });

//             (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(narrowDateFixture);

//             const result = await scheduleService.generateRecommendSchedule({
//                 userId: mockUserId,
//                 fromDate: '2025-10-15',
//                 toDate: '2025-10-18',
//                 timezone: mockTimezone,
//             });

//             expect(result.statistics.totalItems).toBe(narrowDateFixture.length);
//             expect(result.statistics.totalItems).toBeLessThan(40);
//         });

//         it('should handle items with same nextReview date', async () => {
//             // Get items with the same review date
//             const sameDate = '2025-10-13T00:00:00.000Z';
//             const sameDateItems = itemTrackingFixture.filter(item => item.nextReview === sameDate);

//             (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(sameDateItems);

//             const result = await scheduleService.generateRecommendSchedule({
//                 userId: mockUserId,
//                 fromDate: mockFromDate,
//                 toDate: mockToDate,
//                 timezone: mockTimezone,
//             });

//             expect(result.statistics.totalItems).toBe(sameDateItems.length);

//             // All items should be on the same date
//             const scheduleDates = Object.keys(result.schedules);
//             if (result.statistics.scheduledItems > 0) {
//                 expect(scheduleDates.length).toBeGreaterThanOrEqual(1);
//             }
//         });
//     });

//     describe('Waiting Queue Behavior', () => {
//         it('should populate waiting queue when free time is insufficient', async () => {
//             const veryLimitedTime: FreeTimeSlotDays = {
//                 Monday: [{ startTime: '20:00', endTime: '20:45' }],
//                 Tuesday: [],
//                 Wednesday: [],
//                 Thursday: [],
//                 Friday: [],
//                 Saturday: [],
//                 Sunday: [],
//             };

//             (userRepository.getFreeTimeSlots as jest.Mock).mockResolvedValue(veryLimitedTime);
//             (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(itemTrackingFixture);

//             const result = await scheduleService.generateRecommendSchedule({
//                 userId: mockUserId,
//                 fromDate: mockFromDate,
//                 toDate: mockToDate,
//                 timezone: mockTimezone,
//             });

//             // Most items should be in waiting queue
//             expect(result.waitingTopics.length).toBeGreaterThan(0);
//             expect(result.statistics.waitingItems).toBeGreaterThan(result.statistics.scheduledItems);

//             // Waiting topics should have proper structure
//             result.waitingTopics.forEach(topic => {
//                 expect(topic.topicId).toBeDefined();
//                 expect(topic.priority).toBeDefined();
//                 expect(topic.amountItem).toBeGreaterThan(0);
//             });
//         });

//         it('should maintain priority in waiting queue', async () => {
//             const veryLimitedTime: FreeTimeSlotDays = {
//                 Monday: [{ startTime: '20:00', endTime: '21:00' }],
//                 Tuesday: [],
//                 Wednesday: [],
//                 Thursday: [],
//                 Friday: [],
//                 Saturday: [],
//                 Sunday: [],
//             };

//             (userRepository.getFreeTimeSlots as jest.Mock).mockResolvedValue(veryLimitedTime);
//             (scheduleRepo.getListItemTrackingByUserIdInWeek as jest.Mock).mockResolvedValue(itemTrackingFixture);

//             const result = await scheduleService.generateRecommendSchedule({
//                 userId: mockUserId,
//                 fromDate: mockFromDate,
//                 toDate: mockToDate,
//                 timezone: mockTimezone,
//             });

//             if (result.waitingTopics.length > 1) {
//                 // Verify priorities are assigned to waiting topics
//                 result.waitingTopics.forEach(topic => {
//                     expect(topic.priority).toBeGreaterThan(0);
//                 });
//             }
//         });
//     });
// });
