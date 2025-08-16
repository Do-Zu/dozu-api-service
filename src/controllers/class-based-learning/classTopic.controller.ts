import { SuccessResponse } from '@/core/success';
import { Request, Response } from 'express';
import topicService from '@/services/topic/topic.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { getCurrentDateFromRequest } from '@/utils/date';
import { ICreateTopicInClassBody, ITopic, IUpdateTopicBody } from '@/types/topic/topic.type';
import { updateTopicIdOfInputSet } from '@/repositories/inputSet.repo';
import itemSpacedRepetitionTrackingService from '@/services/tracking/itemSpacedRepetitionTracking.service';
import requestHelper from '@/core/request/request.helper';
import { deleteImage, uploadImage } from '@/libs/cloudinary.lib';
import classTopicService from '@/services/class-based-learning/classTopic.service';
import { extractPublicId } from 'cloudinary-build-url';

class ClassTopicController {
    public async getTopicsInClassForStudent(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');

        const currentDate = getCurrentDateFromRequest(req);
        const userId = getUserIdFromRequest(req);
        const result: ITopic[] = await classTopicService.getTopicsInClassForStudent(classId, userId, currentDate);

        SuccessResponse.ok(res, result);
    }

    public async getTopicsInClassForTeacher(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');

        const result: ITopic[] = await classTopicService.getTopicsInClassForTeacher(classId);

        SuccessResponse.ok(res, result);
    }

    public async createTopicForClass(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const { inputSetId } = req.body as { inputSetId: string };
        const classId = requestHelper.getIdParam(req, 'classId');

        const { name, description } = req.body as ICreateTopicInClassBody;
        const imageFile = req.file;

        let imageUrl: string | null = null;
        if (imageFile) {
            const imageObject = await uploadImage(imageFile.buffer);
            if (!imageObject) {
                throw new Error('Cannot upload image');
            }
            imageUrl = imageObject.secure_url;
        }

        const result = await classTopicService.createTopicForClass(classId, userId, { name, description, imageUrl });
        if (inputSetId) {
            const topicId = result.topicId;
            await updateTopicIdOfInputSet({ topicId: topicId, inputSetId: parseInt(inputSetId) });
        }

        SuccessResponse.created(res, result);
    }

    public async updateTopicInClass(req: Request, res: Response) {
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

    public async deleteTopicInClass(req: Request, res: Response) {
        const topicId = requestHelper.getIdParam(req, 'topicId');

        await topicService.deleteTopicById(topicId);
        SuccessResponse.ok(res, topicId);
    }

    public async startLearningFlashcards(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const topicId = requestHelper.getIdParam(req, 'topicId');

        await itemSpacedRepetitionTrackingService.initializeStudentTrackingForTopic(userId, topicId);
        SuccessResponse.ok(res, {});
    }
}

export default new ClassTopicController();
