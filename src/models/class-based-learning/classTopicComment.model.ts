import {
    pgTable,
    serial,
    integer,
    jsonb,
    boolean,
    text,
    timestamp,
    varchar,
    unique,
    pgEnum,
} from 'drizzle-orm/pg-core';
import { topicsTable } from '../topic.model';

export const nodeTypeEnum = pgEnum('node_type', ['mindmap', 'flashcard', 'quiz']);

export type NodeType = (typeof nodeTypeEnum.enumValues)[number];

export const classTopicCommentsTable = pgTable('class_topic_comments', {
    commentId: serial('comment_id').primaryKey(),
    topicId: integer('topic_id')
        .notNull()
        .references(() => topicsTable.topicId, { onDelete: 'cascade' }),
    nodeId: varchar('node_id', { length: 36 }).notNull(),
    author: jsonb('author').notNull().$type<{
        user_id: number;
        name: string;
        avatar?: string;
    }>(),
    typeNode: nodeTypeEnum('node_type').notNull(),
    isDeleted: boolean('is_deleted').notNull().default(false),
    parentCmtId: integer('parent_cmt_id').references((): any => classTopicCommentsTable.commentId, {
        onDelete: 'cascade',
    }),
    level: integer('level').notNull().default(0),
    content: text('content').notNull(),
    reactionCount: integer('reaction_count').notNull().default(0),
    replyCount: integer('reply_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type IClassTopicCommentInserted = typeof classTopicCommentsTable.$inferInsert;
export type IClassTopicCommentSelected = typeof classTopicCommentsTable.$inferSelect;
