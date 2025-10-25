import { TypeSelectLearningMaterial } from '@/models';
import { getLearningMaterialOfClass } from '@/repositories/class-based-learning/learning-material/learningMaterial.repo';

type ClassworkResult =
    | {
          success: true;
          learningMaterials: TypeSelectLearningMaterial[];
          //add quiz and assignment here
      }
    | { success: false; reason: string }; //todo:reformat as template type for every services

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
