import { pgTable, serial, varchar, timestamp, integer } from 'drizzle-orm/pg-core';
import { classesTable } from '../class-based-learning/class.model';
import { topicsTable } from '../topic/topic.model';

export const learningMaterialTable = pgTable('learning_materials', {
    learningMaterialId: serial('learning_material_id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    content: varchar('content', { length: 255 }),
    topicId: integer('topic_id').references(() => topicsTable.topicId, { onDelete: 'cascade' }),
    classId: integer('class_id')
        .notNull()
        .references(() => classesTable.classId, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type TypeSelectLearningMaterial = typeof learningMaterialTable.$inferSelect;
export type TypeInsertLearningMaterial = typeof learningMaterialTable.$inferInsert;
