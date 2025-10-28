import { learningMaterialTable, TypeInsertLearningMaterial, TypeSelectLearningMaterial } from '@/models';
import db from '@/libs/drizzleClient.lib';
import { eq } from 'drizzle-orm';

export const insertLearningMaterial = async (
    inputLearningMaterial: TypeInsertLearningMaterial
): Promise<TypeSelectLearningMaterial> => {
    const [insertedLearningMaterial] = await db.insert(learningMaterialTable).values(inputLearningMaterial).returning();
    return insertedLearningMaterial;
};

export const getLearningMaterialOfClass = async (classId: number): Promise<TypeSelectLearningMaterial[]> => {
    const learningMaterials = await db
        .select({
            learningMaterialId: learningMaterialTable.learningMaterialId,
            classId: learningMaterialTable.classId,
            topicId: learningMaterialTable.topicId,
            title: learningMaterialTable.title,
            description: learningMaterialTable.description,

            createdAt: learningMaterialTable.createdAt,
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
            description: learningMaterialTable.description,
            createdAt: learningMaterialTable.createdAt,
        })
        .from(learningMaterialTable)
        .where(eq(learningMaterialTable.learningMaterialId, learningMaterialId));
    return learningMaterial;
};
