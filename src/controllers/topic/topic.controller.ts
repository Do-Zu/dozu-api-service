import { BadRequest, DatabaseError } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import { ITopicBasic, ITopicAdded, ITopicUpdated } from '@/types/topic/topic.type';
import logger from '@/utils/logger';
import { Request, Response } from 'express';
import TopicService from '@/services/topic/topic.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { ITopicsForUserReturned } from '@/repositories/topic.repo';

const topicService = new TopicService();

class TopicController {
  constructor() {}

  public async handleGetSingleTopic(req: Request, res: Response): Promise<void> {
    let { topicId } = req.params as { topicId: string | number };

    topicId = parseInt(topicId as string);

    if (isNaN(topicId)) {
      throw new BadRequest('Invalid param, cannot get topic');
    }

    let topic: ITopicBasic | undefined;

    try {
      topic = await topicService.handleGetSingleTopic(topicId);
    } catch (err) {
      logger.error(err);
      throw new DatabaseError('Something went wrong');
    }

    SuccessResponse.ok(res, topic);
  }

  public async handleGetAllTopicsForUser(req: Request, res: Response): Promise<void> {
    const userId = getUserIdFromRequest(req);
    if (isNaN(userId)) {
      throw new BadRequest('Invalid param, cannot get topics');
    }

    let topics: ITopicsForUserReturned;
    try {
      topics = await topicService.handleGetAllTopicsForUser(userId);
    } catch (err) {
      logger.error(err);
      throw new DatabaseError('Something went wrong');
    }

    SuccessResponse.ok(res, topics);
  }

  public async handleInsertSingleTopicForUser(req: Request, res: Response): Promise<void> {
    const userId = getUserIdFromRequest(req);

    if (isNaN(userId)) {
      throw new BadRequest('Invalid param, cannot insert topic');
    }

    const { topicName, topicDescription } = req.body as {
      topicName: string;
      topicDescription: string;
    };
    const topicAddedValue: ITopicAdded = {
      userId,
      name: topicName,
      description: topicDescription,
    };

    try {
      await topicService.handleInsertSingleTopicForUser(topicAddedValue);
    } catch (err) {
      logger.error(err);
      throw new DatabaseError('Something went wrong');
    }

    SuccessResponse.ok(res, {});
  }

  public async handleUpdateSingleTopic(req: Request, res: Response): Promise<void> {
    let { topicId } = req.params as { topicId: string | number };

    topicId = parseInt(topicId as string);

    if (isNaN(topicId)) {
      throw new BadRequest('Invalid param, cannot update topic');
    }

    const { topicName, topicDescription } = req.body as {
      topicName: string;
      topicDescription: string;
    };
    const topicUpdatedValue: ITopicUpdated = {
      name: topicName,
      description: topicDescription,
    };

    try {
      await topicService.handleUpdateSingleTopic(topicId, topicUpdatedValue);
    } catch (err) {
      logger.error(err);
      throw new DatabaseError('Something went wrong');
    }

    SuccessResponse.ok(res, {});
  }

  // còn flashcards -> vẫn xóa topic
  public async handleDeleteSingleTopicForUser(req: Request, res: Response): Promise<void> {
    let { topicId } = req.params as { topicId: string | number };

    topicId = parseInt(topicId as string);

    if (isNaN(topicId)) {
      throw new BadRequest('Invalid param, cannot update topic');
    }

    try {
      await topicService.handleDeleteSingleTopic(topicId);
    } catch (err) {
      logger.error(err);
      throw new DatabaseError('Something went wrong');
    }
    SuccessResponse.noContent(res);
  }
}

export default TopicController;
