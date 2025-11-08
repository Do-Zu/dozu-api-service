import db from '@/libs/drizzleClient.lib';
import { inputSetTable, TypeInsertInputSet, TypeSelectInputSet } from '@/models';
import { ContentTypeInputSet } from '@/types/inputSet/inputSet.type';
import { and, eq } from 'drizzle-orm';

type updateTopicIdOfInputIdParams = {
    inputSetId: number;
    topicId: number;
};

export const insertInputSet = async (newInputSet: TypeInsertInputSet): Promise<TypeSelectInputSet> => {
    const [insertedInputSet] = await db.insert(inputSetTable).values(newInputSet).returning();
    return insertedInputSet;
};

export const getInputSetByTopicId = async (
    topicId: number,
    contentType?: ContentTypeInputSet
): Promise<TypeSelectInputSet> => {
    const query = contentType
        ? and(eq(inputSetTable.topicId, topicId), eq(inputSetTable.contentType, contentType))
        : eq(inputSetTable.topicId, topicId);

    const [result] = await db.select().from(inputSetTable).where(query);
    return result;
};

export const updateTopicIdOfInputSet = async ({
    inputSetId,
    topicId,
}: updateTopicIdOfInputIdParams): Promise<TypeSelectInputSet> => {
    const [inputSet] = await db
        .update(inputSetTable)
        .set({ topicId: topicId })
        .where(eq(inputSetTable.setId, inputSetId))
        .returning();
    return inputSet;
};
