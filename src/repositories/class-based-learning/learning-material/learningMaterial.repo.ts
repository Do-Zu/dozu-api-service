import { learningMaterialTable, TypeInsertLearningMaterial, TypeSelectLearningMaterial } from '@/models';
import db from '@/libs/drizzleClient.lib';

export const insertLearningMaterial = async (
    inputLearningMaterial: TypeInsertLearningMaterial
): Promise<TypeSelectLearningMaterial> => {
    const [insertedLearningMaterial] = await db.insert(learningMaterialTable).values(inputLearningMaterial).returning();
    return insertedLearningMaterial;
};
