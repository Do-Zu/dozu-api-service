import { sql } from 'drizzle-orm';
import { pgTable, text, integer, timestamp, jsonb, varchar, serial } from 'drizzle-orm/pg-core';
import { topicsTable } from '../topic.model';
import { getSystemDate } from '@/utils/date';

export interface IFeynmanDetectedGap {
    word: string;
    suggestion: string;
}

export interface IFeynmanQuestion {
    content: string;
}

export interface IFeynmanFeedback {
    summary: string;
    strengths: string[];
    improvements: string[];
}

export interface IFeynmanEvaluationScores {
    overall: number;
    clarity: number;
    correctness: number;
    simplicity: number;
    structure: number;
    analogyUse: number;
}

export interface IFeynmanGlossaryEntry {
    term: string;
    simpleDefinition: string;
}

export interface IFeynmanSessionAIState {
    questions: { content: string }[];
    hints: string[];
    detectedGaps: IFeynmanDetectedGap[];
    clarityScore?: number;
    feedback?: string;
}

export interface IFeynmanSessionReviewState {
    scores: IFeynmanEvaluationScores;
    feedback: IFeynmanFeedback;
    improvedExplanation: string;
    stepByStep: string[];
    hints: string[];
    questions: IFeynmanQuestion[];
    detectedGaps: IFeynmanDetectedGap[];
    glossary: IFeynmanGlossaryEntry[];
    actionPlan: string[];
}

export interface FeynmanSessionSavePayload {
    topicId: string;
    method: string;
    explanationText: string;
    explanationHtml: string;
    highlightedWords: string[];
    questions: IFeynmanSessionAIState;
    review?: IFeynmanSessionReviewState;
    step: number;
    version?: number;
    savedAt: string;
}

export const feynmanSessions = pgTable('feynman_sessions', {
    id: serial('id').primaryKey(),
    topicId: integer('topic_id')
        .notNull()
        .references(() => topicsTable.topicId, {
            onDelete: 'cascade',
        }),
    method: varchar({ length: 50 }).notNull(),
    explanationText: text('explanation_text').notNull(),
    explanationHtml: text('explanation_html').notNull(),
    highlightedWords: text('highlighted_words')
        .array()
        .notNull()
        .default(sql`ARRAY[]::text[]`),
    questions: jsonb('questions').$type<IFeynmanSessionAIState>().notNull(),
    review: jsonb('review').$type<IFeynmanSessionReviewState | null>().default(null),
    step: integer('step').notNull().default(1),
    version: integer('version').default(1),
    savedAt: timestamp('saved_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => getSystemDate()),
});

export const feynmanSessionsIndexes = {
    topicIdx: sql`CREATE INDEX IF NOT EXISTS idx_feynman_topic ON feynman_sessions (topic_id)`,
    topicMethodIdx: sql`CREATE INDEX IF NOT EXISTS idx_feynman_topic_method ON feynman_sessions (topic_id, method)`,
};

export type FeynmanSessionRecord = typeof feynmanSessions.$inferSelect;
export type NewFeynmanSessionRecord = typeof feynmanSessions.$inferInsert;
