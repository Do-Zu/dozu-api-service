import { BadRequest } from "@/core/error";
import topicService from "@/services/topic/topic.service";
import { getUserIdFromRequest, isTeacher } from "@/utils/auth/authHelpers.utils";
import { NextFunction, Request, Response } from "express";
import requestHelper from "@/core/request/request.helper";
import classService from "@/services/class-based-learning/class.service";
import classEnrollmentService from "@/services/class-based-learning/classEnrollment.service";

class TopicMiddleware {
    // not used & tested yet 
    async verifyTopicById(req: Request, res: Response, next: NextFunction) {
        const topicId = requestHelper.getIdParam(req, 'topicId');
        const topic = await topicService.getTopicById(topicId);
        if(topic) {
            requestHelper.setResource(req, 'topic', topic);
            next();
        } else {
            throw new BadRequest('Topic is invalid!');
        }
    }

    async verifyUserCanAccessTopic(req: Request, res: Response, next: NextFunction) {
        const userId = getUserIdFromRequest(req);
        const teacher = await isTeacher(req);
        const topic = requestHelper.getResource(req, 'topic');
        
        if(topic.classId) {
            let isAuthorized: boolean;
            if(teacher) {
                isAuthorized = await classService.isTeacherOwnerOfClass(topic.classId, userId);
            } else {
                isAuthorized = await classEnrollmentService.isStudentInClass(topic.classId, userId);
            }
            
            if(!isAuthorized) {
                throw new BadRequest('Forbidden: You do not have access to this topic!');
            }
            next();

        } else {
            if(topic.userId !== userId) {
                throw new BadRequest('Forbidden: You are not the owner of this topic!');
            }
            next();
        }
    }
}

export default new TopicMiddleware();