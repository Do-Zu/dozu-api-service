import { pgTable, integer, primaryKey } from 'drizzle-orm/pg-core';
import { attachmentTable } from '../attachment.model';
import { learningMaterialTable } from './learningMaterial.model';

export const attachmentInLearningMaterialTable = pgTable(
    'attachment_in_learning_material',
    {
        attachmentId: integer('attachment_id')
            .notNull()
            .references(() => attachmentTable.attachmentId, { onDelete: 'cascade' }),
        learningMaterialId: integer('learning_material_id')
            .notNull()
            .references(() => learningMaterialTable.learningMaterialId, { onDelete: 'cascade' }),
    },
    table => ({
        pk: primaryKey({ columns: [table.attachmentId, table.learningMaterialId] }),
    })
);
