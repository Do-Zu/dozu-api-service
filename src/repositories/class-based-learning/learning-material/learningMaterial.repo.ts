import { learningMaterialTable, TypeInsertLearningMaterial, TypeSelectLearningMaterial } from '@/models';
import db from '@/libs/drizzleClient.lib';
import { eq } from 'drizzle-orm';

export const insertLearningMaterial = async (
    inputLearningMaterial: TypeInsertLearningMaterial
): Promise<TypeSelectLearningMaterial> => {
    const [insertedLearningMaterial] = await db.insert(learningMaterialTable).values(inputLearningMaterial).returning();
    return insertedLearningMaterial;
};

export const updateLearningMaterial = async (
    inputLearningMaterial: Omit<TypeSelectLearningMaterial, 'createdAt'>
): Promise<TypeSelectLearningMaterial> => {
    //exclude learningMaterialId
    const { learningMaterialId, ...updateFields } = inputLearningMaterial;
    //grab existing urls
    const [currentLearningMaterial] = await db
        .select()
        .from(learningMaterialTable)
        .where(eq(learningMaterialTable.learningMaterialId, inputLearningMaterial.learningMaterialId));
    const existingUrls = currentLearningMaterial?.urls ?? [];
    const incomingUrls = inputLearningMaterial.urls ?? [];
    const learningMaterialWithUpdatedUrls = {
        ...updateFields,
        urls: [...existingUrls, ...incomingUrls],
    };

    const [editedLearningMaterial] = await db
        .update(learningMaterialTable)
        .set(learningMaterialWithUpdatedUrls)
        .where(eq(learningMaterialTable.learningMaterialId, learningMaterialId))
        .returning();
    return editedLearningMaterial;
};

export const getLearningMaterialOfClass = async (classId: number): Promise<TypeSelectLearningMaterial[]> => {
    const learningMaterials = await db
        .select({
            learningMaterialId: learningMaterialTable.learningMaterialId,
            classId: learningMaterialTable.classId,
            topicId: learningMaterialTable.topicId,
            title: learningMaterialTable.title,
            content: learningMaterialTable.content,

            createdAt: learningMaterialTable.createdAt,
            urls: learningMaterialTable.urls,
        })
        .from(learningMaterialTable)
        .where(eq(learningMaterialTable.classId, classId));
    return learningMaterials;
};

export const getLearningMaterial = async ({
    learningMaterialId,
}: {
    learningMaterialId: number;
}): Promise<TypeSelectLearningMaterial> => {
    const [learningMaterial] = await db
        .select({
            learningMaterialId: learningMaterialTable.learningMaterialId,
            classId: learningMaterialTable.classId,
            topicId: learningMaterialTable.topicId,
            title: learningMaterialTable.title,
            content: learningMaterialTable.content,
            createdAt: learningMaterialTable.createdAt,
            urls: learningMaterialTable.urls,
        })
        .from(learningMaterialTable)
        .where(eq(learningMaterialTable.learningMaterialId, learningMaterialId));
    return learningMaterial;
};

export const deleteLearningMaterialById = async ({
    learningMaterialId,
}: {
    learningMaterialId: number;
}): Promise<number> => {
    const [deletedLearningMaterial] = await db
        .delete(learningMaterialTable)
        .where(eq(learningMaterialTable.learningMaterialId, learningMaterialId))
        .returning({ learningMaterialId: learningMaterialTable.learningMaterialId });
    return deletedLearningMaterial.learningMaterialId;
};
