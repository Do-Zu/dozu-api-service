import db from '@/libs/drizzleClient.lib';
import { ankiSettingsTable } from '@/models';
import { IAnkiSetting, IUpdateAnkiSettingBody } from '@/types/anki-setting/ankiSetting.type';
import { and, eq } from 'drizzle-orm';
import userTopicSettingService from '../topic/userTopicSetting.service';
import { DEFAULT_SETTING_NAME } from './constant';
import { BadRequest, Forbidden, NotFoundError } from '@/core/error';

class AnkiSettingService {
    public async getSettingsForUser(userId: number): Promise<IAnkiSetting[]> {
        const result = await db.select().from(ankiSettingsTable).where(eq(ankiSettingsTable.userId, userId));
        return result;
    }

    public async getUserSettingsWithActiveForTopic({
        userId,
        topicId,
    }: {
        userId: number;
        topicId: number;
    }): Promise<{ settings: IAnkiSetting[]; activeSettingId: number }> {
        // make sure if topic setting doesn't exist, create default setting before get all settings
        const topicSetting = await this.getSettingForTopicAndUser(topicId, userId);
        const allSettings = await this.getSettingsForUser(userId);
        return {
            settings: allSettings,
            activeSettingId: topicSetting.ankiSettingId,
        };
    }

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
        const [result] = await db
            .insert(ankiSettingsTable)
            .values({ userId, isDefault: true, name: DEFAULT_SETTING_NAME })
            .returning();
        return result;
    }

    public async createSettingForUser({ userId, name }: { userId: number; name: string }): Promise<IAnkiSetting> {
        const [result] = await db.insert(ankiSettingsTable).values({ userId, isDefault: false, name }).returning();
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
            throw new NotFoundError('Setting not found');
        }
        return result;
    }

    public async updateSettingById({
        settingId,
        userId,
        data,
    }: {
        settingId: number;
        userId: number;
        data: IUpdateAnkiSettingBody;
    }): Promise<IAnkiSetting> {
        const [result] = await db
            .update(ankiSettingsTable)
            .set(data)
            .where(and(eq(ankiSettingsTable.ankiSettingId, settingId), eq(ankiSettingsTable.userId, userId)))
            .returning();

        if (!result) {
            throw new NotFoundError('Setting not found');
        }

        return result;
    }

    public async deleteSettingById({ settingId, userId }: { settingId: number; userId: number }): Promise<void> {
        const setting = await this.getSettingById(settingId);

        if (!setting) {
            throw new NotFoundError('Setting not found');
        }
        if (setting.userId !== userId) {
            throw new Forbidden("Forbidden: Cannot delete another user's setting");
        }
        if (setting.isDefault) {
            throw new BadRequest('This is the default setting and cannot be deleted.');
        }

        await db
            .delete(ankiSettingsTable)
            .where(and(eq(ankiSettingsTable.ankiSettingId, settingId), eq(ankiSettingsTable.userId, userId)));
    }
}

export default new AnkiSettingService();
