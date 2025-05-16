import { BadRequest, DatabaseError } from "@/core/error";
import { SuccessResponse } from "@/core/success";
import { IBasicTopic, ITopic } from "@/types/topic/topic.type";
import logger from "@/utils/logger";
import { Request, Response } from "express";
import TopicService from "@/services/topic/topic.service";

const topicService = new TopicService();

class TopicController {
    constructor() {}

    public async handleGetSingleTopic(req: Request, res: Response) : Promise<void> {
        let { topicId } = req.params as { topicId: string | number }; 

        topicId = parseInt(topicId as string);

        if(isNaN(topicId)) {
            throw new BadRequest('Invalid param, cannot get topic');
        }

        let topic: Pick<ITopic, 'topicId' | 'name' | 'description'> | undefined;

        try {
            topic = await topicService.handleGetSingleTopic(topicId);
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, { topic });
    }

    public async handleGetAllTopicsForUser(req: Request, res: Response) : Promise<void> {
        let { userId } = req.query as { userId: string | number };

        userId = parseInt(userId as string);

        if(isNaN(userId)) {
            throw new BadRequest('Invalid param, cannot get topics');
        }
        
        let topics: IBasicTopic[];
        try {
            topics = await topicService.handleGetAllTopicsForUser(userId);   
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, { topics });
    }

    public async handleInsertSingleTopicForUser(req: Request, res: Response) : Promise<void> {
        let { userId } = req.query as { userId: string | number };

        userId = parseInt(userId as string);

        if(isNaN(userId)) {
            throw new BadRequest('Invalid param, cannot insert topic');
        }

        const { topicName, topicDescription } = req.body as { topicName: string, topicDescription: string };
        const topicAddedValue : Pick<ITopic, 'userId' | 'name' | 'description'> = { userId, name: topicName, description: topicDescription };

        let topicAdded: Pick<ITopic, 'topicId' | 'name' | 'description'>;
        try {
            topicAdded = await topicService.handleInsertSingleTopicForUser(topicAddedValue);
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, { topic: topicAdded });
    }

    public async handleUpdateSingleTopic(req: Request, res: Response) : Promise<void> {
        let { topicId } = req.params as { topicId: string | number };

        topicId = parseInt(topicId as string);

        if(isNaN(topicId)) {
            throw new BadRequest('Invalid param, cannot update topic');
        }

        const { topicName, topicDescription } = req.body as { topicName: string, topicDescription: string };
        const topicUpdatedValue : Pick<ITopic, 'name' | 'description'> = { name: topicName, description: topicDescription };

        let topicUpdated: Pick<ITopic, 'topicId' | 'name' | 'description'>;
        try {
            topicUpdated = await topicService.handleUpdateSingleTopic(topicId, topicUpdatedValue);
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }
        
        SuccessResponse.ok(res, { topic: topicUpdated });
    }

    // còn flashcards -> vẫn xóa topic
    public async handleDeleteSingleTopicForUser(req: Request, res: Response) : Promise<void> {
        let { topicId } = req.params as { topicId: string | number };

        topicId = parseInt(topicId as string);

        if(isNaN(topicId)) {
            throw new BadRequest('Invalid param, cannot update topic');
        }

        // let topicsDeleted : Pick<ITopic, 'topicId'>[];
        try {
            // topicsDeleted = await db
            await topicService.handleDeleteSingleTopic(topicId);
        } catch(err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }
        SuccessResponse.noContent(res);
    }
}

export default TopicController;