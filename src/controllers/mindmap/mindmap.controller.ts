import { Response, Request } from 'express';
import { SuccessResponse } from '@/core/success';
import { InsertMindmap } from '@/models/mindmap/mindmap.model';

import { BadRequest, InternalServerError } from '@/core/error';
import {
  getAllMindmapNodesByTopicId,
  getMindmapByTopicId,
  insertMindmap,
  updateMindmapByTopicId,
} from '@/repositories/mindmap/mindmap.repo';
import {
  changeNodeIdOfFlashcardsService,
  getFlashcardsOfNodeService,
  getSingleNodeService,
} from '@/services/mindmap/mindmap.service';

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

export const getAllNodesOfMindmapController = async (req: Request, res: Response) => {
  const topicId = parseInt(req.params.topicId);

  if (!topicId) {
    throw new BadRequest('Missing topic id');
  } else {
    const result = await getAllMindmapNodesByTopicId(topicId);
    SuccessResponse.ok(res, result);
  }
};

export const getAllChildrenOfANodeController = async (req: Request, res: Response) => {
  const topicId = parseInt(req.params.topicId);
  const nodeId = req.params.nodeId;

  if (!topicId) {
    throw new BadRequest('Missing topic id');
  } else {
    const getAllChildNodeIdAndSelf = (result: Array<string> = [], edges: any, nodeId: string) => {
      // const result = [];
      result.push(nodeId);
      const childreNodeIds = [];
      for (let edge of edges) {
        if (edge.source === nodeId) {
          getAllChildNodeIdAndSelf(result, edges, edge.target);
        }
      }
      // getAllChildNodeIdAndSelf(result, edges, nodeId);
      return result;
    };
    const result = await getMindmapByTopicId(topicId);

    const nodes = result?.mindmapData?.nodes;
    const edges = result?.mindmapData?.edges;
    const rootNode = nodes?.find(node => node.id == nodeId);
    if (!rootNode) {
      throw new InternalServerError(`Root node not found`);
    } else {
      const result = getAllChildNodeIdAndSelf([], edges, rootNode.id);

      // console.log(node);
      SuccessResponse.ok(res, result);
    }
  }
};

export const getSingularNodeController = async (req: Request, res: Response) => {
  const topicId = parseInt(req.params.topicId);
  const nodeId = req.params.nodeId;
  const result = await getSingleNodeService(topicId, nodeId);

  SuccessResponse.ok(res, result);
};

export const addFlashcardsToNodeController = async (req: Request, res: Response) => {
  const topicId = parseInt(req.params.topicId);
  const nodeId = req.params.nodeId;

  const flashcardIds = req.body.FlashcardIds;
  const result = await changeNodeIdOfFlashcardsService(topicId, nodeId, flashcardIds);

  SuccessResponse.ok(res, result);
};

export const getFlashcardsOfNodeController = async (req: Request, res: Response) => {
  const nodeId = req.params.nodeId;
  const result = await getFlashcardsOfNodeService(nodeId);
  SuccessResponse.ok(res, result);
};
