import { BadRequest, Forbidden } from '@/core/error';
import classService from '@/services/class-based-learning/class.service';
import classEnrollmentService from '@/services/class-based-learning/classEnrollment.service';
import topicService from '@/services/topic/topic.service';
import { getUserIdFromRequest, isTeacher } from '@/utils/auth/authHelpers.utils';
import logger from '@/utils/logger';
import { NextFunction, Request, Response } from 'express';

class FlashcardMiddleware {
    async verifyUserCanAccessFlashcards(req: Request, res: Response, next: NextFunction) {
        const userId = getUserIdFromRequest(req);
        const topicId = Number(req.query.topicId); 
        const teacher = await isTeacher(req);
        let isAuthorized: boolean = true;
        let message: string = '';

        const topic = await topicService.getTopicById(topicId);
        if (!topic) {
            throw new BadRequest('Invalid topic');
        }
        if (topic.classId) {
            if (teacher) {
                const isOwner = await classService.isTeacherOwnerOfClass(topic.classId, userId);
                if (!isOwner) {
                    isAuthorized = false;
                    message = 'Forbidden: You are not the owner of this class!';
                }
            } else {
                const inClass = await classEnrollmentService.isStudentInClass(topic.classId, userId);
                if (!inClass) {
                    isAuthorized = false;
                    message = 'Forbidden: You do not belong to this class!';
                }
            }
        } else {
            if (topic.userId !== userId) {
                isAuthorized = false;
                message = 'Forbidden: You are not the owner of this topic!';
            }
        }

        if (!isAuthorized) {
            logger.warn(message);
            throw new Forbidden(message);
        } else {
            next();
        }
    }
}

export default new FlashcardMiddleware();