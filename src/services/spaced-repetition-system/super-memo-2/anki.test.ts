// import { addDays, addMinutes } from 'date-fns';
// import ankiService, { IAnkiResult } from './anki.service';
// import AnkiService, { IAnkiCard, IAnkiRating, IAnkiStatus, startingEase } from './anki.service';
// import { getSystemDate, TimeUnit } from '@/utils/date';

// type IPrivateAnkiCard = Omit<IAnkiCard, 'lastReviewed'> & {
//     lastReviewed: Date;
// };

// jest.mock('@/utils/date');

// describe('AnkiService.schedule', () => {
//     const lastReviewed = new Date(2023, 9, 11, 10, 0, 0);

//     const baseCard: IPrivateAnkiCard = {
//         flashcardId: 1,
//         status: 'learning',
//         step: null,
//         easinessFactor: '2.5',
//         lastReviewed,
//         nextReview: lastReviewed,
//         reviewInterval: 0,
//     };

//     describe('handleLearning', () => {
//         test('LEARNING + AGAIN', () => {
//             const card = { ...baseCard };
//             const result = ankiService.handleLearning(card, IAnkiRating.AGAIN);
//             const expected: IAnkiResult = {
//                 ...baseCard,
//                 step: 0,
//                 nextReview: addMinutes(lastReviewed, 1),
//                 nextReviewInterval: { interval: 1, timeUnit: TimeUnit.MINUTE },
//             };
//             expect(result).toEqual(expected);
//         });

//         test('LEARNING + HARD, step = null', () => {
//             const card = { ...baseCard };
//             expect(() => ankiService.handleLearning(card, IAnkiRating.HARD)).toThrow('Card step is NULL');
//         });

//         test('LEARNING + HARD, step # null', () => {
//             const card = { ...baseCard, step: 0 };
//             const result = ankiService.handleLearning(card, IAnkiRating.HARD);
//             const expected: IAnkiResult = {
//                 ...card,
//                 nextReview: addMinutes(lastReviewed, 5.5),
//                 nextReviewInterval: { interval: 5.5, timeUnit: TimeUnit.MINUTE },
//             };
//             expect(result).toEqual(expected);
//         });

//         test('LEARNING + GOOD, step = null', () => {
//             const card = { ...baseCard };
//             expect(() => ankiService.handleLearning(card, IAnkiRating.GOOD)).toThrow('Card step is NULL');
//         });

//         test('LEARNING + GOOD, step # null, not final step', () => {
//             const card = { ...baseCard, step: 0 };
//             const result = ankiService.handleLearning(card, IAnkiRating.GOOD);
//             const expected: IAnkiResult = {
//                 ...card,
//                 step: 1,
//                 nextReview: addMinutes(lastReviewed, 10),
//                 nextReviewInterval: { interval: 10, timeUnit: TimeUnit.MINUTE },
//             };
//             expect(result).toEqual(expected);
//         });

//         test('LEARNING + GOOD, step # null, final step', () => {
//             const card = { ...baseCard, step: 1 };
//             const result = ankiService.handleLearning(card, IAnkiRating.GOOD);
//             const expected: IAnkiResult = {
//                 ...card,
//                 status: IAnkiStatus.REVIEW,
//                 step: null,
//                 nextReview: addDays(lastReviewed, 1),
//                 nextReviewInterval: { interval: 1, timeUnit: TimeUnit.DAY },
//             };
//             expect(result).toEqual(expected);
//         });

//         test('LEARNING + EASY', () => {
//             const card = { ...baseCard, step: 0 };
//             const result = ankiService.handleLearning(card, IAnkiRating.EASY);
//             const expected: IAnkiResult = {
//                 ...card,
//                 status: IAnkiStatus.REVIEW,
//                 step: null,
//                 nextReview: addDays(lastReviewed, 4),
//                 nextReviewInterval: { interval: 4, timeUnit: TimeUnit.DAY },
//             };
//             expect(result).toEqual(expected);
//         });
//     });

//     describe('handleReview', () => {
//         test('REVIEW + AGAIN', () => {
//             const card = { ...baseCard, status: IAnkiStatus.REVIEW, reviewInterval: 3, easinessFactor: '2.5' };
//             const result = ankiService.handleReview(card, IAnkiRating.AGAIN);
//             const expected: IAnkiResult = {
//                 ...card,
//                 status: IAnkiStatus.RELEARNING,
//                 step: 0,
//                 easinessFactor: '2.000', // 2.5 * 0.8
//                 reviewInterval: 0,
//                 nextReview: addMinutes(lastReviewed, 1),
//                 nextReviewInterval: { interval: 1, timeUnit: TimeUnit.MINUTE },
//             };
//             expect(result).toEqual(expected);
//         });

//         test('REVIEW + HARD', () => {
//             const card = { ...baseCard, status: IAnkiStatus.REVIEW, reviewInterval: 3, easinessFactor: '2.5' };
//             const result = ankiService.handleReview(card, IAnkiRating.HARD);
//             const expected: IAnkiResult = {
//                 ...card,
//                 easinessFactor: '2.125', // 2.5 * 0.85
//                 reviewInterval: Math.round(3 * 1.2),
//                 nextReview: addDays(lastReviewed, Math.round(3 * 1.2)),
//                 nextReviewInterval: { interval: Math.round(3 * 1.2), timeUnit: TimeUnit.DAY },
//             };
//             expect(result).toEqual(expected);
//         });

//         test('REVIEW + GOOD', () => {
//             const card = { ...baseCard, status: IAnkiStatus.REVIEW, reviewInterval: 3, easinessFactor: '2.5' };
//             const result = ankiService.handleReview(card, IAnkiRating.GOOD);
//             const expectedInterval = Math.round(3 * 2.5);
//             const expected: IAnkiResult = {
//                 ...card,
//                 reviewInterval: expectedInterval,
//                 nextReview: addDays(lastReviewed, expectedInterval),
//                 nextReviewInterval: { interval: expectedInterval, timeUnit: TimeUnit.DAY },
//             };
//             expect(result).toEqual(expected);
//         });

//         test('REVIEW + EASY', () => {
//             const card = { ...baseCard, status: IAnkiStatus.REVIEW, reviewInterval: 3, easinessFactor: '2.5' };
//             const result = ankiService.handleReview(card, IAnkiRating.EASY);
//             const expectedInterval = Math.round(3 * 2.5 * 1.3);
//             const expectedEf = (2.5 * 1.15).toFixed(3);
//             const expected: IAnkiResult = {
//                 ...card,
//                 easinessFactor: expectedEf,
//                 reviewInterval: expectedInterval,
//                 nextReview: addDays(lastReviewed, expectedInterval),
//                 nextReviewInterval: { interval: expectedInterval, timeUnit: TimeUnit.DAY },
//             };
//             expect(result).toEqual(expected);
//         });
//     });

//     describe('handleRelearning', () => {
//         test('RELEARNING + AGAIN', () => {
//             const card = {
//                 ...baseCard,
//                 status: IAnkiStatus.RELEARNING,
//                 step: 1,
//                 reviewInterval: 3,
//                 easinessFactor: '2.5',
//             };
//             const result = ankiService.handleRelearning(card, IAnkiRating.AGAIN);
//             const expected: IAnkiResult = {
//                 ...card,
//                 step: 0,
//                 nextReview: addMinutes(lastReviewed, 1),
//                 nextReviewInterval: { interval: 1, timeUnit: TimeUnit.MINUTE },
//             };
//             expect(result).toEqual(expected);
//         });

//         test('RELEARNING + HARD, step = null', () => {
//             const card = { ...baseCard, status: IAnkiStatus.RELEARNING, step: null };
//             expect(() => ankiService.handleRelearning(card, IAnkiRating.HARD)).toThrow('Card step is NULL');
//         });

//         test('RELEARNING + HARD, step # null', () => {
//             const card = { ...baseCard, status: IAnkiStatus.RELEARNING, step: 0, easinessFactor: '2.5' };
//             const result = ankiService.handleRelearning(card, IAnkiRating.HARD);
//             const expected: IAnkiResult = {
//                 ...card,
//                 nextReview: addMinutes(lastReviewed, 5.5),
//                 nextReviewInterval: { interval: 5.5, timeUnit: TimeUnit.MINUTE },
//             };
//             expect(result).toEqual(expected);
//         });

//         test('RELEARNING + GOOD, step = null', () => {
//             const card = { ...baseCard, status: IAnkiStatus.RELEARNING, step: null };
//             expect(() => ankiService.handleRelearning(card, IAnkiRating.GOOD)).toThrow('Card step is NULL');
//         });

//         test('RELEARNING + GOOD, step # null, not final step', () => {
//             const card = {
//                 ...baseCard,
//                 status: IAnkiStatus.RELEARNING,
//                 step: 0,
//                 reviewInterval: 3,
//                 easinessFactor: '2.5',
//             };
//             const result = ankiService.handleRelearning(card, IAnkiRating.GOOD);
//             const expected: IAnkiResult = {
//                 ...card,
//                 step: 1,
//                 nextReview: addMinutes(lastReviewed, 10),
//                 nextReviewInterval: { interval: 10, timeUnit: TimeUnit.MINUTE },
//             };
//             expect(result).toEqual(expected);
//         });

//         test('RELEARNING + GOOD, step # null, final step', () => {
//             const card = {
//                 ...baseCard,
//                 status: IAnkiStatus.RELEARNING,
//                 step: 1,
//                 reviewInterval: 3,
//                 easinessFactor: '2.5',
//             };
//             const result = ankiService.handleRelearning(card, IAnkiRating.GOOD);
//             const expectedInterval = Math.round(3 * 2.5);
//             const expected: IAnkiResult = {
//                 ...card,
//                 status: IAnkiStatus.REVIEW,
//                 step: null,
//                 reviewInterval: expectedInterval,
//                 nextReview: addDays(lastReviewed, expectedInterval),
//                 nextReviewInterval: { interval: expectedInterval, timeUnit: TimeUnit.DAY },
//             };
//             expect(result).toEqual(expected);
//         });

//         test('RELEARNING + EASY', () => {
//             const card = {
//                 ...baseCard,
//                 status: IAnkiStatus.RELEARNING,
//                 step: 0,
//                 reviewInterval: 3,
//                 easinessFactor: '2.5',
//             };
//             const result = ankiService.handleRelearning(card, IAnkiRating.EASY);
//             const expectedInterval = Math.round(3 * 2.5 * 1.3);
//             const expected: IAnkiResult = {
//                 ...card,
//                 status: IAnkiStatus.REVIEW,
//                 step: null,
//                 reviewInterval: expectedInterval,
//                 nextReview: addDays(lastReviewed, expectedInterval),
//                 nextReviewInterval: { interval: expectedInterval, timeUnit: TimeUnit.DAY },
//             };
//             expect(result).toEqual(expected);
//         });
//     });
// });
