import { BadRequest } from "@/core/error";
import topicService from "@/services/topic/topic.service";
import { NextFunction, Request, Response } from "express";

class TopicMiddleware {
    // not used & tested yet 
    async verifyTopicById(req: Request, res: Response, next: NextFunction) {
        const { topicId } = req.validatedParams as { topicId: number };
        const topic = await topicService.getTopicById(topicId);
        if(topic) {
            next();
        } else {
            throw new BadRequest('Topic is invalid!');
        }
    }
}

export default new TopicMiddleware();