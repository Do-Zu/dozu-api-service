import requestHelper from '@/core/request/request.helper';
import { Request, Response } from 'express';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { SuccessResponse } from '@/core/success';
import { BadRequest } from '@/core/error';
import { IUpdateAnkiSettingBody } from '@/types/anki-setting/ankiSetting.type';
import ankiSettingService from '@/services/anki-setting/ankiSetting.service';
import userTopicSettingService from '@/services/topic/userTopicSetting.service';

class AnkiSettingController {
    public async getDefaultSettingForUser(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const result = await ankiSettingService.getOrCreateDefaultSettingForUser(userId);
        SuccessResponse.ok(res, result);
    }

    public async getSettingsForUser(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const result = await ankiSettingService.getSettingsForUser(userId);
        SuccessResponse.ok(res, result);
    }

    public async getUserSettingsWithActiveForTopic(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const topicId = requestHelper.getIdParam(req, 'topicId');

        const result = await ankiSettingService.getUserSettingsWithActiveForTopic({ userId, topicId });

        SuccessResponse.ok(res, result);
    }

    public async updateSettingById(req: Request, res: Response) {
        const settingId = requestHelper.getIdParam(req, 'settingId');
        const userId = getUserIdFromRequest(req);
        const setting = req.body as IUpdateAnkiSettingBody | undefined | null;
        if (!setting) {
            throw new BadRequest('Updated setting is invalid');
        }
        if (setting.name !== undefined && setting.name.length === 0) {
            throw new BadRequest("The setting's name is invalid");
        }
        const result = await ankiSettingService.updateSettingById({ settingId, userId, data: setting });

        SuccessResponse.ok(res, result);
    }

    public async updateSettingByIdAndAssignToTopic(req: Request, res: Response) {
        const settingId = requestHelper.getIdParam(req, 'settingId');
        const userId = getUserIdFromRequest(req);
        const topicId = requestHelper.getIdParam(req, 'topicId');
        const setting = req.body as IUpdateAnkiSettingBody | undefined | null;
        if (!setting) {
            throw new BadRequest('Updated setting is invalid');
        }
        if (setting.name !== undefined && setting.name.length === 0) {
            throw new BadRequest("The setting's name is invalid");
        }

        // should use transaction
        const updatedAnkiSetting = await ankiSettingService.updateSettingById({ settingId, userId, data: setting });
        await userTopicSettingService.upsertUserTopicSetting({
            settingId,
            userId,
            topicId,
        });

        SuccessResponse.ok(res, updatedAnkiSetting);
    }

    public async createSettingForUser(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const { name } = req.body as { name: string };
        if (!name) {
            throw new BadRequest("The setting's name is invalid");
        }

        const result = await ankiSettingService.createSettingForUser({ userId, name });
        SuccessResponse.created(res, result);
    }

    public async deleteSettingById(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const settingId = requestHelper.getIdParam(req, 'settingId');

        await ankiSettingService.deleteSettingById({ settingId, userId });
        SuccessResponse.ok(res, settingId);
    }
}

export default new AnkiSettingController();
