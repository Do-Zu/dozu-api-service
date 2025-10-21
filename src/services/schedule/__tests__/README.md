# Schedule Service Unit Tests

This directory contains comprehensive unit and integration tests for the Schedule Service, focusing on the schedule generation algorithm that distributes learning items across available time slots based on user preferences.

## Test Files

### 1. `schedule.service.test.ts`

Main unit test file covering 15 test cases for the schedule generation functionality.

#### Test Cases Coverage:

1. **Empty Item List** - Handles when no items need to be scheduled
2. **Small Number of Items (10 items)** - Basic scheduling with sufficient time
3. **Large Number of Items (40 items)** - Distribution across multiple days
4. **Mixed Difficulty Levels** - Prioritization based on easiness factor (Easy ≥2.8, Medium 1.6-2.7, Hard ≤1.5)
5. **Different Status Types** - Handles 'new', 'learning', and 'review' statuses
6. **Limited Free Time Slots** - Manages waiting queue when time is constrained
7. **No Free Time Available** - All items go to waiting queue
8. **Multiple Topics Same Day** - Grouping and scheduling multiple topics
9. **Overdue Items** - Prioritizes items past their review date
10. **Custom Free Time Preferences** - Respects user-defined availability
11. **Very Short Time Slots** - Skips slots under 30 minutes
12. **Efficiency Calculation** - Validates (scheduledItems/totalItems) \* 100
13. **Same Topic Different Types** - Separates flashcard, quiz, coding types
14. **Slots Generated Count** - Accurate counting of scheduled slots
15. **Null/Undefined Free Time** - Falls back to default schedule

### 2. `schedule.integration.test.ts`

Integration tests using the full 40-item fixture to test real-world scenarios.

#### Test Suites:

- **Full 40 Items Schedule Generation** - End-to-end testing with complete dataset
- **Limited Free Time** - Evening/weekend availability scenarios
- **Abundant Free Time** - Full day availability scenarios
- **Priority and Difficulty Distribution** - Validation of scheduling algorithm
- **Edge Cases with Fixture Data** - Subset filtering, same dates
- **Waiting Queue Behavior** - Priority maintenance in queue

### 3. `fixtures/itemTracking.fixture.ts`

Test data fixture with 40 `ItemTrackingWithTopic` items.

#### Fixture Characteristics:

- **Date Range**: 2025-10-10 to 2025-10-25 (16 days)
- **Topics**: 8 different topics (101-108)
    - Algorithms - Sorting
    - Data Structures - Trees
    - Networking - HTTP
    - Databases - SQL
    - JavaScript - Async
    - TypeScript - Generics
    - DevOps - Docker
    - System Design - Caching
- **Types**: flashcard, quiz, reading, coding
- **Statuses**: new, learning, review
- **Difficulty Levels**:
    - Easy (EF ≥ 2.8): 8 items
    - Medium (EF 1.6-2.7): 24 items
    - Hard (EF ≤ 1.5): 8 items
- **Repetition Numbers**: 0-6 (various learning stages)

## Key Features Tested

### Priority Calculation

The algorithm calculates priority based on:

- **Easiness Factor**: Lower = Higher priority (harder items get more attention)
- **Repetition Number**: Higher = Lower priority (well-reviewed items need less focus)
- **Status**: new > learning > review
- **Overdue Boost**: Items past nextReview date get priority boost

Formula:

```typescript
priority = (easinessFactorSum / (repetitionNumberSum + 1)) * statusMultiplier * overdueBoost;
```

### Time Slot Management

- Minimum slot duration: 30 minutes
- Break time: 5 minutes per session
- Items per slot: 10-50 (MIN_ITEMS_PER_SLOT to MAX_ITEMS_PER_SLOT)
- Learning time per item:
    - Easy: 0.25 minutes
    - Medium: 1 minute
    - Hard: 2 minutes

### Grouping Strategy

Items are grouped by:

1. **Next Review Date** (primary)
2. **Topic ID** (secondary)
3. **Type** (tertiary: flashcard, quiz, reading, coding)
4. **Status** (quaternary: new, learning, review)

### Free Time Slots

Default schedule (used when user has no preferences):

- **Monday**: Morning (5-6), Morning/Noon (7-11:30), Afternoon (14-17), Evening (20-22)
- **Tuesday**: Morning (7:30-11:30), Afternoon (14-17), Evening (19:30-22)
- **Wednesday**: Early Morning (5:15-6:30), Morning (8:15-11:15), Afternoon (14:15-17:30), Evening (20:30-22:30)
- **Thursday**: Early Morning (5:15-6), Morning (8:15-10), Afternoon (14-17:35), Evening (18:45-22:30)
- **Friday**: Morning (9:15-11), Afternoon (13:45-15:15), Evening (17:45-22:45)
- **Saturday**: Morning (7:30-11:30), Afternoon (13:45-16:30), Evening (20:15-21:45)
- **Sunday**: Morning (5-9), Afternoon (14-16)

## Running Tests

### Run all tests

```bash
npm test
```

### Run specific test file

```bash
npm test -- schedule.service.test
```

### Run with coverage

```bash
npm run test:coverage
```

### Watch mode for development

```bash
npm run test:watch
```

## Test Results Validation

Each test validates:

- ✅ **Total Items Count**: Matches input
- ✅ **Scheduled Items**: Items successfully placed in time slots
- ✅ **Waiting Items**: Items that couldn't be scheduled
- ✅ **Efficiency**: Percentage of items scheduled (0-100%)
- ✅ **Slots Generated**: Number of study sessions created
- ✅ **Date Range**: All schedules within specified dates
- ✅ **Time Constraints**: All slots fit within free time
- ✅ **Priority Order**: Higher priority items scheduled first
- ✅ **Item Accounting**: scheduledItems + waitingItems = totalItems

## Expected Behavior

### High Efficiency Scenarios (>80%)

- Abundant free time (8+ hours/day)
- Small number of items (<20)
- Items spread across multiple days

### Medium Efficiency Scenarios (50-80%)

- Moderate free time (4-6 hours/day)
- Medium number of items (20-30)
- Some items in waiting queue

### Low Efficiency Scenarios (<50%)

- Limited free time (<2 hours/day)
- Large number of items (>35)
- Many items in waiting queue
- Short time slots (<45 minutes)

## Mocked Dependencies

The tests mock:

- `@/repositories/schedule/schedule.repo` - Data access layer
- `@/repositories/user/user.repo` - User preferences
- `@/utils/date` - Date manipulation functions

## API Endpoint

The service is exposed via:

```
POST /schedule/generate
```

Request body:

```typescript
{
    userId: number;
    fromDate: Date | string;
    toDate: Date | string;
    timezone: string;
}
```

Response:

```typescript
{
  schedules: Record<string, IItemScheduleGenerated[]>;
  waitingTopics: IItemScheduleGenerated[];
  preferredTime: string;
  statistics: {
    totalItems: number;
    scheduledItems: number;
    waitingItems: number;
    efficiency: number;
    slotsGenerated: number;
  };
}
```

## Contributing

When adding new test cases:

1. Follow the existing naming pattern: `Case X: Description`
2. Include both positive and negative scenarios
3. Verify all statistics calculations
4. Test edge cases (empty, null, boundary values)
5. Document expected behavior in comments

## Notes

- Tests use fixed dates (2025-10-10 to 2025-10-25) for consistency
- Date-fns library is used for date manipulation
- Priority queue ensures highest priority items are scheduled first
- Spaced repetition algorithm is based on SM-2 (SuperMemo 2)
