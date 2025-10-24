import { usersTable } from "@/models";
import { classesTable } from "./class.model";
import { integer, pgTable, serial, text, timestamp, varchar, pgEnum } from "drizzle-orm/pg-core";

export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'rejected', 'expired']);

export const classInvitesTable = pgTable('class_invites', {
    inviteId: serial('invite_id').primaryKey(),
    classId: integer('class_id')
        .notNull()
        .references(() => classesTable.classId, { onDelete: 'cascade' }),
    invitedBy: integer('invited_by')
        .notNull()
        .references(() => usersTable.userId, { onDelete: 'cascade' }),
    invitedUserId: integer('invited_user_id')
        .references(() => usersTable.userId, { onDelete: 'cascade' }),
    invitedEmail: varchar('invited_email', { length: 100 }),
    token: varchar('token', { length: 50 }).notNull().unique(),
    status: inviteStatusEnum('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    useLimit: integer('use_limit'), // null = unlimited
    usedCount: integer('used_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export type IClassInviteInserted = typeof classInvitesTable.$inferInsert;
export type IClassInviteSelected = typeof classInvitesTable.$inferSelect;
