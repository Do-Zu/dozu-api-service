import { usersTable } from "@/models";
import { integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const classesTable = pgTable('classes', {
    classId: serial('class_id').primaryKey(),
    teacherId: integer('teacher_id')
        .notNull()
        .references(() => usersTable.userId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull().default(''),
    invitationCode: varchar('invitation_code', { length: 10 }).notNull().unique(),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type IClassInserted = typeof classesTable.$inferInsert;