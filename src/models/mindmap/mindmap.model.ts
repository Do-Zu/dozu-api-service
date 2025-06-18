import { pgTable,  varchar, jsonb, timestamp, serial, integer } from 'drizzle-orm/pg-core';

import { topicsTable } from '../topic.model';

type NodeData = {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    isRoot: boolean;
  };
};

type EdgeData = {
  id: string;
  source: string;
  target: string;
};

export type MindmapData = {
  nodes: NodeData[];
  edges: EdgeData[];
};

export const mindmapsTable = pgTable('mindmaps', {
  mindmapId: serial('mindmap_id').primaryKey(),
  topicId: integer('topic_id')
    .notNull()
    .references(() => topicsTable.topicId, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).default('New mind map'),
  mindmapData: jsonb('mindmap_data').$type<MindmapData>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type SelectMindmap = typeof mindmapsTable.$inferSelect;
export type InsertMindmap = typeof mindmapsTable.$inferInsert;
