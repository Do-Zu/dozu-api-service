import { Forbidden, NotFoundError } from '@/core/error';
import db from '@/libs/drizzleClient.lib';
import { userTopicSettingsTable } from '@/models';
import { IUserTopicSetting } from '@/types/topic/userTopicSetting.type';
import { and, eq } from 'drizzle-orm';
import ankiSettingService from '../anki-setting/ankiSetting.service';

class UserTopicSettingService {
    public async getUserTopicSetting(topicId: number, userId: number): Promise<IUserTopicSetting | undefined> {
        const [result] = await db
            .select()
            .from(userTopicSettingsTable)
            .where(and(eq(userTopicSettingsTable.topicId, topicId), eq(userTopicSettingsTable.userId, userId)))
            .limit(1);

        return result;
    }

    public async upsertUserTopicSetting({
        topicId,
        userId,
        settingId,
    }: {
        topicId: number;
        userId: number;
        settingId: number;
    }): Promise<IUserTopicSetting | null> {
        const ankiSetting = await ankiSettingService.getSettingById(settingId);
        if (!ankiSetting) {
            throw new NotFoundError('Setting not found');
        }
        if (ankiSetting.isDefault) {
            await db
                .delete(userTopicSettingsTable)
                .where(and(eq(userTopicSettingsTable.userId, userId), eq(userTopicSettingsTable.topicId, topicId)));
            return null;
        }

        const topicSetting = await this.getUserTopicSetting(topicId, userId);
        if (topicSetting && topicSetting.userId !== ankiSetting.userId) {
            throw new Forbidden("Forbidden: Cannot modify another user's setting");
        }

        let result: IUserTopicSetting;
        if (!topicSetting) {
            [result] = await db.insert(userTopicSettingsTable).values({ topicId, userId, settingId }).returning();
        } else {
            [result] = await db
                .update(userTopicSettingsTable)
                .set({ settingId })
                .where(and(eq(userTopicSettingsTable.userId, userId), eq(userTopicSettingsTable.topicId, topicId)))
                .returning();
        }

        if (!result) {
            throw new NotFoundError('Topic setting not found');
        }

        return result;
    }
}

export default new UserTopicSettingService();
