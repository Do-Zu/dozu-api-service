import db, { Transaction } from '@/libs/drizzleClient.lib';
import { flashcardsTable } from '@/models';
import { InsertMindmap, mindmapsTable, SelectMindmap } from '@/models/mindmap/mindmap.model';
import { eq } from 'drizzle-orm';


export const insertMindmap = async (inputMindmap: InsertMindmap): Promise<SelectMindmap> => {
  const [insertedMindmap] = await db.insert(mindmapsTable).values(inputMindmap).returning();
  return insertedMindmap;
};

export const getMindmapByTopicId = async (topicId: number): Promise<SelectMindmap> => {
  const [result] = await db.select().from(mindmapsTable).where(eq(mindmapsTable.topicId, topicId));
  return result;
};

export const getAllMindmapNodesByTopicId = async (topicId: number) => {
  const [result] = await db.select().from(mindmapsTable).where(eq(mindmapsTable.topicId, topicId));
  return result?.mindmapData?.nodes;
};

export const updateMindmapByTopicId = async (
  topicId: number,
  inputMindmap: InsertMindmap
): Promise<SelectMindmap> => {
  const [result] = await db
    .update(mindmapsTable)
    .set(inputMindmap)
    .where(eq(mindmapsTable.topicId, topicId))
    .returning();
  return result;
};

export const getFlashcardsByNodeId = async (nodeId: string) => {
  const result = await db.select().from(flashcardsTable).where(eq(flashcardsTable.nodeId, nodeId));
  return result;
};

export const deleteMindmapByTopicId = async (topicId: number, tx?: Transaction)=>{
 const executor = tx ?? db;
        await executor
            .delete(mindmapsTable)
            .where(eq(mindmapsTable.topicId, topicId));
}


