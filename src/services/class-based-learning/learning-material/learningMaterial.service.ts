import { TypeInsertLearningMaterial, TypeSelectAttachment, TypeSelectLearningMaterial } from '@/models';
import {
    getLearningMaterial,
    insertLearningMaterial,
} from '@/repositories/class-based-learning/learning-material/learningMaterial.repo';
import { attachmentService } from '../attachment/attachment.service';
import { ReturnAttachment } from '@/types/class-based-learning/attachment/attachment.type';

type LearningMaterialWithAttachments = {
    learningMaterial: TypeSelectLearningMaterial;
    attachments?: ReturnAttachment[];
};

interface IInputResource {
    title: string;
    contentType: string;
    metadata: object;
}

const getAttachmentsOfLearningMaterial = async ({
    learningMaterialId,
}: {
    learningMaterialId: number;
}): Promise<ReturnAttachment[]> => {
    //call attachment service
    const returnAttachments = await attachmentService.getAttachmentsOfLearningMaterial({
        learningMaterialId: learningMaterialId,
    });
    return returnAttachments;
};

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

export const getLearningMaterialService = async ({
    learningMaterialId,
}: {
    learningMaterialId: number;
}): Promise<LearningMaterialResult> => {
    const resultLearningMaterial = await getLearningMaterial({ learningMaterialId: learningMaterialId });
    //get attachments
    const resultAttachments = await getAttachmentsOfLearningMaterial({ learningMaterialId: learningMaterialId });

    if (!resultLearningMaterial) {
        return { success: false, reason: 'Internal server error' };
    } else if (resultLearningMaterial && !resultAttachments) {
        return {
            success: true,
            learningMaterialWithAttachments: {
                learningMaterial: resultLearningMaterial,
            },
        };
    } else {
        return {
            success: true,
            learningMaterialWithAttachments: {
                learningMaterial: resultLearningMaterial,
                attachments: resultAttachments,
            },
        };
    }
};
