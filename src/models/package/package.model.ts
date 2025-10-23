import { pgTable, serial, integer, varchar, timestamp, foreignKey } from 'drizzle-orm/pg-core';
import { usersTable } from '@/models/user.model';

export const packagesTable = pgTable(
    'packages',
    {
        id: serial('id').primaryKey(),
        userId: integer('user_id')
            .notNull()
            .references(() => usersTable.userId, { onDelete: 'cascade' }),
        title: varchar('title', { length: 255 }).notNull(),
        parentId: integer('parent_id'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    table => {
        return {
            parentFk: foreignKey({
                columns: [table.parentId],
                foreignColumns: [table.id],
                name: 'packages_parent_id_fkey',
            }).onDelete('set null'),
        };
    }
);
