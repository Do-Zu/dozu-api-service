import { TypeSelectLearningMaterial } from '@/models';
import { getLearningMaterialOfClass } from '@/repositories/class-based-learning/learning-material/learningMaterial.repo';

type ClassworkResult =
    | {
          success: true;
          learningMaterials: TypeSelectLearningMaterial[];
      }
    | { success: false; reason: string }; 

export const getClassworkInClassService = async ({ classId }: { classId: number }): Promise<ClassworkResult> => {
    const resultLearningMaterial = await getLearningMaterialOfClass(classId);

    if (!resultLearningMaterial) {
        return { success: false, reason: 'Internal server error' };
    } else {
        return {
            success: true,
            learningMaterials: resultLearningMaterial,
        };
    }
};
