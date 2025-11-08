import { BadRequest } from '@/core/error';
import { flashcardsTable, SelectMindmap } from '@/models';
import {
    deleteMindmapByTopicId,
    getFlashcardClassProgress,
    getFlashcardProgress,
    getFlashcardsByNodeId,
    getMindmapByTopicId,
    getNodesStats,
} from '@/repositories/mindmap/mindmap.repo';
import { inArray, sql, SQL } from 'drizzle-orm';
import db from '@/libs/drizzleClient.lib';
import { IStudentInClass } from '@/types/class-based-learning/classEnrollment.type';
import classEnrollmentService from '../class-based-learning/classEnrollment.service';
import { NodeStat } from '@/types/mindmap/nodeStat.type';

export const getSingleNodeService = async (topicId: number, nodeId: string) => {
    const mindmap = await getMindmapByTopicId(topicId);
    return {};
};

export const getMindmapAndProgressSummaryService = async (
    topicId: number,
    userId: number
): Promise<{ mindmap: SelectMindmap | undefined; nodeStats: NodeStat[] }> => {
    const mindmap = await getMindmapByTopicId(topicId);
    let nodeStats: NodeStat[] = [];
    // check null
    if (!mindmap) {
        return { mindmap: undefined, nodeStats: [] };
    } //returns empty, handled on frontend

    if (!mindmap.mindmapData) {
        //returns empty, check on frontend if handled correctly
        return {
            mindmap: { ...mindmap },
            nodeStats: [],
        };
    }
    const nodeIds: string[] = mindmap.mindmapData.nodes.map(node => node.id);
    nodeStats = await getNodesStats({ nodeIds: nodeIds, userId });

    // const addStatisticToNode = (mindmap,nodeStats)=>{

    // }

    return {
        mindmap: {
            ...mindmap,
            mindmapData: {
                ...mindmap.mindmapData,
                nodes: mindmap.mindmapData.nodes.map(node => ({
                    ...node,
                    data: {
                        ...node.data,
                        statistics: nodeStats.find(stat => stat.nodeId === node.id) ?? {
                            total: 0,
                            mature: 0,
                        },
                    },
                })),
            },
        },
        nodeStats,
    }; //separate to function or some shit:)
};

//couples nodeStats to specific nodes
// return {
//     mindmap: {
//         ...mindmap,
//         mindmapData: mindmap.mindmapData.nodes.map(node => ({
//             ...node,
//             stats: nodeStats.find(stat => stat.nodeId === node.id) ?? { total: 0, mature: 0 },
//         })),
//     },
//     nodeStats,
// };
//get list of nodes in mindmap

// return { mindmap: mindmap, nodeStats };

export const getFlashcardsOfNodeService = async (
    //todo:Split to repo layer
    nodeId: string
) => {
    //todo:type array
    const result = await getFlashcardsByNodeId(nodeId);

    return result;
};

export const getFlashcardsOfNodeWithSummaryService = async (
    //todo:Split to repo layer
    userId: number,
    nodeId: string
) => {
    //todo:type array
    const result = await getFlashcardsByNodeId(nodeId);
    const flashcardIds: number[] = result.map(flashcard => flashcard.flashcardId);
    const summaryData = await getFlashcardProgress(userId, flashcardIds);
    //get user id

    return { flashcards: result, summaryData: summaryData };
};

export const getFlashcardsOfNodeWithClassProgressSummaryService = async (
    //todo:Split to repo layer
    classId: number,
    nodeId: string
) => {
    //todo:type array
    const studentResult: IStudentInClass[] = await classEnrollmentService.getStudentsInClass(classId);
    const studentIds: number[] = studentResult.map(student => student.userId);

    const flashcardResult = await getFlashcardsByNodeId(nodeId);
    const flashcardIds: number[] = flashcardResult.map(flashcard => flashcard.flashcardId);

    const summaryData = await getFlashcardClassProgress(studentIds, flashcardIds);
    //get user id

    return { flashcards: flashcardResult, summaryData: summaryData };
};

// export const getProgressOfNodeService = async (
//     //todo:Split to repo layer
//     nodeId: string
// ) => {
//     //todo:type array
//     const result = await getFlashcardsProgressByNodeId(nodeId);

//     return result;
// };

export const changeNodeIdOfFlashcardsService = async (
    //todo:Split to repo layer
    topicId: number,
    nodeId: string,
    flashcardIds: []
) => {
    //todo:type array
    const ids: number[] = [];
    const sqlChunks: SQL[] = [];
    const inputs = flashcardIds;
    if (inputs.length === 0) {
        throw new BadRequest('Empty');
    } else {
        sqlChunks.push(sql`(case`);
        for (const input of inputs) {
            sqlChunks.push(sql`when ${flashcardsTable.flashcardId} = ${input} then ${nodeId}`);
            ids.push(input);
        }
        sqlChunks.push(sql`end)`);
        const finalSql: SQL = sql.join(sqlChunks, sql.raw(' '));
        await db.update(flashcardsTable).set({ nodeId: finalSql }).where(inArray(flashcardsTable.flashcardId, ids));
    }
    return {};
};

export const deleteMindmapService = async ({ topicId }: { topicId: number }) => {
    await deleteMindmapByTopicId(topicId);
    
};
