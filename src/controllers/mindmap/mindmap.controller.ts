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
    deleteMindmapService,
    getFlashcardsOfNodeService,
    getFlashcardsOfNodeWithClassProgressSummaryService,
    getFlashcardsOfNodeWithSummaryService,
    getMindmapAndProgressSummaryService,
    getSingleNodeService,
    linkFlashcardsToNodeService,
    unlinkFlashcardsFromNodeService,
} from '@/services/mindmap/mindmap.service';
import { uploadImage } from '@/libs/cloudinary.lib';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import requestHelper from '@/core/request/request.helper';

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
    // const userId = getUserIdFromRequest(req);
    const userId = getUserIdFromRequest(req);
    if (!Number.isFinite(userId)) {
        throw new BadRequest('Missing user id');
    }

    if (!topicId) {
        throw new BadRequest('Missing topic id');
    } else {
        // const resultMindmap = await getMindmapByTopicId(topicId);npm
        const result = await getMindmapAndProgressSummaryService(topicId, userId);

        SuccessResponse.ok(res, { ...result });
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

export const updateFlashcardLinksController = async (req: Request, res: Response) => {
    const topicId = requestHelper.getIdParam(req, 'topicId');
    const nodeId = req.params.nodeId;
    if (!nodeId) {
        throw new BadRequest('nodeId is required');
    }

    const body = req.body as Partial<{
        linkedFlashcards: number[];
        unlinkedFlashcards: number[];
    }>;

    const linkedFlashcards = Array.isArray(body.linkedFlashcards) ? body.linkedFlashcards : [];
    const unlinkedFlashcards = Array.isArray(body.unlinkedFlashcards) ? body.unlinkedFlashcards : [];
    
    let result: { flashcardId: number; nodeId: string | null }[] = [];

    if (linkedFlashcards.length > 0) {
        const linkedResult = await linkFlashcardsToNodeService({ topicId, nodeId, flashcards: linkedFlashcards });
        const temp = linkedResult.map(card => ({ flashcardId: card.flashcardId, nodeId: card.nodeId }));
        result = result.concat(temp);
    }
    if (unlinkedFlashcards.length > 0) {
        const unlinkedResult = await unlinkFlashcardsFromNodeService({
            topicId,
            nodeId,
            flashcards: unlinkedFlashcards,
        });
        const temp = unlinkedResult.map(card => ({ flashcardId: card.flashcardId, nodeId: card.nodeId }));
        result = result.concat(temp);
    }

    SuccessResponse.ok(res, result);
};

export const getFlashcardsOfNodeController = async (req: Request, res: Response) => {
    const nodeId = req.params.nodeId;
    const userId = getUserIdFromRequest(req);
    const result = await getFlashcardsOfNodeWithSummaryService(userId, nodeId);
    SuccessResponse.ok(res, result);
};

export const getProgressOfNodeController = async (req: Request, res: Response) => {
    const nodeId = req.params.nodeId;
    const result = await getFlashcardsOfNodeService(nodeId);
    SuccessResponse.ok(res, result);
};

export const getClassProgressOfNodeController = async (req: Request, res: Response) => {
    let { classId } = req.params as { classId: string | number };
    classId = parseInt(classId as string);
    if (isNaN(classId)) {
        throw new BadRequest('Invalid param, cannot get students');
    }

    //  const studentResult: IStudentInClass[] = await classEnrollmentService.getStudentsInClass(classId);
    //         // SuccessResponse.ok(res, result);

    const nodeId = req.params.nodeId;
    const result = await getFlashcardsOfNodeWithClassProgressSummaryService(classId, nodeId);
    SuccessResponse.ok(res, result);
};

export const uploadImageTESTDELETELATER = async (req: Request, res: Response) => {
    let imageObject;

    if (req.file) {
        // Conditionally attach image
        imageObject = await uploadImage(req.file.buffer);
        imageObject?.url;
    }
    SuccessResponse.ok(res, { object: imageObject });
};

export const deleteMindmapController = async (req: Request, res: Response) => {
    const topicId = parseInt(req.params.topicId);
    if (!topicId) {
        throw new BadRequest('Missing topic id');
    } else {
        await deleteMindmapService({ topicId: topicId });
        SuccessResponse.ok(res, { message: 'Deleted' });
    }
};
