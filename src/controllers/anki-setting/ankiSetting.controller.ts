import requestHelper from '@/core/request/request.helper';
import { Request, Response } from 'express';
import db from '@/libs/drizzleClient.lib';
import { ankiSettingsTable } from '@/models';
import { and, eq } from 'drizzle-orm';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { SuccessResponse } from '@/core/success';
import { BadRequest } from '@/core/error';
import { IUpdateAnkiSettingBody } from '@/types/anki-setting/ankiSetting.type';
import ankiSettingService from '@/services/anki-setting/ankiSetting.service';

class AnkiSettingController {
    public async getDefaultSettingForUser(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const result = await ankiSettingService.getOrCreateDefaultSettingForUser(userId);
        SuccessResponse.ok(res, result);
    }

    public async getSettingsForUser(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const result = await db.select().from(ankiSettingsTable).where(eq(ankiSettingsTable.userId, userId));
        SuccessResponse.ok(res, result);
    }

    public async updateSettingById(req: Request, res: Response) {
        const settingId = requestHelper.getIdParam(req, 'settingId');
        const userId = getUserIdFromRequest(req);
        const setting = req.body as IUpdateAnkiSettingBody | undefined | null;
        if (!setting) {
            throw new BadRequest('Updated setting is invalid');
        }
        const [result] = await db
            .update(ankiSettingsTable)
            .set(setting)
            .where(and(eq(ankiSettingsTable.ankiSettingId, settingId), eq(ankiSettingsTable.userId, userId)))
            .returning();

        if (!result) {
            throw new BadRequest('Setting not found');
        }

        SuccessResponse.ok(res, result);
    }
}

export default new AnkiSettingController();
