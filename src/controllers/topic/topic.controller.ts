import { SuccessResponse } from '@/core/success';
import { Request, Response } from 'express';
import topicService from '@/services/topic/topic.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { getCurrentTimestampFromRequest } from '@/utils/date';
import { ICreateTopicBody, ITopic, IUpdateTopicBody } from '@/types/topic/topic.type';
import { updateTopicIdOfInputSet } from '@/repositories/inputSet.repo';
import requestHelper from '@/core/request/request.helper';
import { deleteImage, uploadImage } from '@/libs/cloudinary.lib';
import { extractPublicId } from 'cloudinary-build-url';
import { NotFoundError } from '@/core/error';

class TopicController {
    constructor() {}

    public async getTopicById(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const topicId = requestHelper.getIdParam(req, 'topicId');
        const currentDate = getCurrentTimestampFromRequest(req);

        const topic: ITopic | undefined = await topicService.getTopicWithCardCounts({ userId, topicId, currentDate });

        if (!topic) {
            throw new NotFoundError('Topic not found');
        }

        SuccessResponse.ok(res, topic);
    }

    public async getTopicsForUser(req: Request, res: Response): Promise<void> {
        const currentDate = getCurrentTimestampFromRequest(req);
        const userId = getUserIdFromRequest(req);

        const topics: ITopic[] = await topicService.getTopicsForUser(userId, currentDate);
        SuccessResponse.ok(res, topics);
    }

    public async createTopicForUser(req: Request, res: Response): Promise<void> {
        const userId = getUserIdFromRequest(req);
        const { name, description } = req.body as ICreateTopicBody;
        const { inputSetId } = req.body as { inputSetId: string };
        const imageFile = req.file;

        let imageUrl: string | null = null;
        if (imageFile) {
            const imageObject = await uploadImage(imageFile.buffer);
            if (!imageObject) {
                throw new Error('Cannot upload image');
            }
            imageUrl = imageObject.secure_url;
        }

        const result = await topicService.createTopicForUser(userId, { name, description, imageUrl });

        if (inputSetId) {
            const topicId = result.topicId;
            await updateTopicIdOfInputSet({ topicId: topicId, inputSetId: parseInt(inputSetId) });
        }

        SuccessResponse.created(res, result);
    }

    public async updateTopicById(req: Request, res: Response): Promise<void> {
        const topicId = requestHelper.getIdParam(req, 'topicId');
        const { name, description } = req.body as IUpdateTopicBody;
        const imageFile = req.file;
        const topic = requestHelper.getResource(req, 'topic');

        let imageUrl: string | null = null;
        if (imageFile) {
            if (topic.imageUrl) {
                // delete old image of topic
                await deleteImage(extractPublicId(topic.imageUrl));
            }
            // upload new image
            const imageObject = await uploadImage(imageFile.buffer);
            if (!imageObject) {
                throw new Error('Cannot upload image');
            }
            imageUrl = imageObject.secure_url;
        }

        const result = await topicService.updateTopicById(topicId, { name, description, imageUrl });
        SuccessResponse.ok(res, result);
    }

    // còn flashcards -> vẫn xóa topic
    public async deleteTopicById(req: Request, res: Response): Promise<void> {
        const topicId = requestHelper.getIdParam(req, 'topicId');
        const topic = requestHelper.getResource(req, 'topic');

        if (topic.imageUrl) {
            await deleteImage(extractPublicId(topic.imageUrl));
        }

        await topicService.deleteTopicById(topicId);
        SuccessResponse.ok(res, topicId);
    }
}

export default new TopicController();
