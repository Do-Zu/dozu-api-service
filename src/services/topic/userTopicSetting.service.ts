import db from '@/libs/drizzleClient.lib';
import { userTopicSettingsTable } from '@/models';
import { IUserTopicSetting } from '@/types/topic/userTopicSetting.type';
import { and, eq } from 'drizzle-orm';

class UserTopicSettingService {
    public async getUserTopicSetting(topicId: number, userId: number): Promise<IUserTopicSetting | undefined> {
        const [result] = await db
            .select()
            .from(userTopicSettingsTable)
            .where(and(eq(userTopicSettingsTable.topicId, topicId), eq(userTopicSettingsTable.userId, userId)))
            .limit(1);

        return result;
    }
}

export default new UserTopicSettingService();
