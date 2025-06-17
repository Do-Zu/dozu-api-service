import { pgTable, uuid, varchar, jsonb, timestamp, serial } from 'drizzle-orm/pg-core';
import { usersTable } from '../user.model';

type NodeData = {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    pageStartIndex?: number;
    pageEndIndex?: number;
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

export const mindmaps = pgTable('mindmaps', {
  mindmapId: serial('mindmap_id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.userId, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  mindmapData: jsonb('mindmap_data').$type<MindmapData>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
