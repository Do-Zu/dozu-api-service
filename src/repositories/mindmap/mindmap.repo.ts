import db from '@/libs/drizzleClient.lib';
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
