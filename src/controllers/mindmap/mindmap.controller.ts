import { Response, Request } from 'express';
import { SuccessResponse } from '@/core/success';
import { InsertMindmap } from '@/models/mindmap/mindmap.model';

import { BadRequest } from '@/core/error';
import {
  getMindmapByTopicId,
  insertMindmap,
  updateMindmapByTopicId,
} from '@/repositories/mindmap/mindmap.repo';

export const saveTopicMindmapController = async (req: Request, res: Response) => {
  const topicId = parseInt(req.params.topicId);

  const mindmapData = { nodes: req.body.nodes, edges: req.body.edges };
  if (!topicId) {
    throw new BadRequest('Missing topic id');
  } else {
    const resultMindmap = await getMindmapByTopicId(topicId);
    const newMindmap: InsertMindmap = {
      topicId: topicId,
      mindmapData: mindmapData,
      title: req.body.title,
    };
    if (!resultMindmap) {
      const returnData = await insertMindmap(newMindmap);
      SuccessResponse.ok(res, { returnData });
    } else {
      const returnData = await updateMindmapByTopicId(topicId, newMindmap);
      SuccessResponse.ok(res, { returnData });
    }
  }
};

export const getTopicMindmapController = async (req: Request, res: Response) => {
  const topicId = parseInt(req.params.topicId);

  if (!topicId) {
    throw new BadRequest('Missing topic id');
  } else {
    const resultMindmap = await getMindmapByTopicId(topicId);
    SuccessResponse.ok(res, { resultMindmap });
  }
};
