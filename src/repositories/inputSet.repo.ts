import db from '@/libs/drizzleClient.lib';
import { inputSetTable, TypeInsertInputSet, TypeSelectInputSet } from '@/models';
import { eq } from 'drizzle-orm';

export const insertInputSet = async (newInputSet: TypeInsertInputSet): Promise<TypeSelectInputSet> => {
    const [insertedUser] = await db.insert(inputSetTable).values(newInputSet).returning();
    return insertedUser;
};

type updateTopicIdOfInputIdParams = {
    inputSetId: number;
    topicId: number;
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
