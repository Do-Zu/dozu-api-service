import { pgTable, serial, integer, uniqueIndex, foreignKey } from 'drizzle-orm/pg-core';
import { usersTable } from '../user.model';
import { topicsTable } from './topic.model';
import { ankiSettingsTable } from '../anki-setting/ankiSetting.model';

export const userTopicSettingsTable = pgTable(
    'user_topic_settings',
    {
        userTopicSettingId: serial('user_topic_setting_id').primaryKey(),
        userId: integer('user_id')
            .notNull()
            .references(() => usersTable.userId, { onDelete: 'cascade' }),
        topicId: integer('topic_id')
            .notNull()
            .references(() => topicsTable.topicId, { onDelete: 'cascade' }),
        settingId: integer('setting_id')
            .notNull()
            .references(() => ankiSettingsTable.ankiSettingId, { onDelete: 'cascade' }),
    },
    table => ({
        uniqueUserTopic: uniqueIndex('unique_user_topic').on(table.userId, table.topicId),
        fkUserSetting: foreignKey({
            columns: [table.settingId, table.userId],
            foreignColumns: [ankiSettingsTable.ankiSettingId, ankiSettingsTable.userId],
        }).onDelete('cascade'),
    })
);
