import db from '@/libs/drizzleClient.lib';
import { ankiSettingsTable } from '@/models';
import { IAnkiSetting } from '@/types/anki-setting/ankiSetting.type';
import { and, eq } from 'drizzle-orm';
import userTopicSettingService from '../topic/userTopicSetting.service';

class AnkiSettingService {
    public async getSettingById(settingId: number): Promise<IAnkiSetting | undefined> {
        const [result]: IAnkiSetting[] = await db
            .select()
            .from(ankiSettingsTable)
            .where(eq(ankiSettingsTable.ankiSettingId, settingId))
            .limit(1);

        return result;
    }

    public async getOrCreateDefaultSettingForUser(userId: number): Promise<IAnkiSetting> {
        let [result]: IAnkiSetting[] = await db
            .select()
            .from(ankiSettingsTable)
            .where(and(eq(ankiSettingsTable.userId, userId), eq(ankiSettingsTable.isDefault, true)))
            .limit(1);

        if (!result) {
            result = await this.createDefaultSettingForUser(userId);
        }

        return result;
    }

    public async createDefaultSettingForUser(userId: number): Promise<IAnkiSetting> {
        const [result] = await db.insert(ankiSettingsTable).values({ userId, isDefault: true }).returning();
        return result;
    }

    public async getSettingForTopicAndUser(topicId: number, userId: number): Promise<IAnkiSetting> {
        const topicSetting = await userTopicSettingService.getUserTopicSetting(topicId, userId);
        if (!topicSetting) {
            const result = await this.getOrCreateDefaultSettingForUser(userId);
            return result;
        }
        const result = await this.getSettingById(topicSetting.settingId);
        if (!result) {
            throw new Error('settingId does not exist');
        }
        return result;
    }
}

export default new AnkiSettingService();
