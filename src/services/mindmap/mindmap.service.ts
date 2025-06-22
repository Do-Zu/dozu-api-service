import { BadRequest } from '@/core/error';
import { flashcardsTable } from '@/models';
import { getFlashcardsByNodeId, getMindmapByTopicId } from '@/repositories/mindmap/mindmap.repo';
import { inArray, sql, SQL } from 'drizzle-orm';
import db from '@/libs/drizzleClient.lib';

export const getSingleNodeService = async (topicId: number, nodeId: string) => {
  const mindmap = await getMindmapByTopicId(topicId);
  console.log(mindmap);
  return {};
};

export const getFlashcardsOfNodeService = async (
  //todo:Split to repo layer
  nodeId: string
) => {
  //todo:type array
  const result = await getFlashcardsByNodeId(nodeId);

  return result;
};

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
    await db
      .update(flashcardsTable)
      .set({ nodeId: finalSql })
      .where(inArray(flashcardsTable.flashcardId, ids));
  }
  return {};
};
