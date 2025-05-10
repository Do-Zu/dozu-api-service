import {
  pgTable,
  serial,
  integer,
  text,
  decimal,
  date,
  varchar,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { topicsTable } from '@/models/topic.model';

export const questionStatusEnum = pgEnum('question_status', ['new', 'learning', 'review']);

export const questionsTable = pgTable('questions', {
  questionId: serial('question_id').primaryKey(),
  topicId: integer('topic_id').references(() => topicsTable.topicId, { onDelete: 'set null' }),
  questionText: text('question_text').notNull().default(''),
  choices: text('choices').array(),
  correctIndex: integer('correct_index'),
  repetitionNumber: integer('repetition_number').default(0),
  easinessFactor: decimal('easiness_factor', { precision: 3, scale: 2 }).default('2.5'),
  interval: integer('interval').default(0),
  lastReviewed: date('last_reviewed'),
  nextReview: date('next_review'),
  status: questionStatusEnum('status').default('new'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
