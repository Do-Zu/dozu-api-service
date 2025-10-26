import { TypeInsertLearningMaterial, TypeSelectAttachment, TypeSelectLearningMaterial } from '@/models';
import { insertLearningMaterial } from '@/repositories/class-based-learning/learning-material/learningMaterial.repo';
import { attachmentService } from '../attachment/attachment.service';

type LearningMaterialWithAttachments = {
    learningMaterial: TypeSelectLearningMaterial;
    attachments?: TypeSelectAttachment[];
};

interface IInputResource {
    title: string;
    contentType: string;
    metadata: object;
}

type LearningMaterialResult =
    | {
          success: true;
          learningMaterialWithAttachments: LearningMaterialWithAttachments;
      }
    | { success: false; reason: string }; //todo:reformat as template type for every services

export const createLearningMaterialService = async ({
    title,
    description,
    topicId,
    classId,
    inputResources,
}: {
    title: string;
    description: string;
    topicId?: number;
    classId: number;
    inputResources?: IInputResource[]; 
}): Promise<LearningMaterialResult> => {
    let addedAttachments;
    if (inputResources) {
        //handle saving attachment
        addedAttachments = await attachmentService.handleInsertMultipleResources({ inputResources });
        //add relation here
    }

    const newLearningMaterial: TypeInsertLearningMaterial = {
        title,
        description,
        classId,
        topicId,
    };
    const resultLearningMaterial = await insertLearningMaterial(newLearningMaterial);

    //add relations to attachment
    if (addedAttachments) {
        const result = await attachmentService.linkMultipleAttachmentsToLearningMaterial({
            learningMaterialId: resultLearningMaterial.learningMaterialId,
            attachments: addedAttachments,
        });
    }

    if (!resultLearningMaterial) {
        return { success: false, reason: 'Internal server error' };
    } else {
        return {
            success: true,
            learningMaterialWithAttachments: {
                learningMaterial: resultLearningMaterial,
                attachments: addedAttachments,
            },
        };
    }
};
