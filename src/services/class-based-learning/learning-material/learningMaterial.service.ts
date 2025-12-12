import { TypeInsertLearningMaterial, TypeSelectLearningMaterial } from '@/models';
import {
    deleteLearningMaterialById,
    getLearningMaterial,
    getLearningMaterialOfClass,
    insertLearningMaterial,
    updateLearningMaterial,
} from '@/repositories/class-based-learning/learning-material/learningMaterial.repo';
import { attachmentService } from '../attachment/attachment.service';
import { ReturnAttachment } from '@/types/class-based-learning/attachment/attachment.type';
import { attachmentInLMService } from '../attachment/attachmentInLearningMaterial.service';

type LearningMaterialWithAttachments = {
    learningMaterial: TypeSelectLearningMaterial;
    attachments?: ReturnAttachment[];
};

type DeleteLearningMaterialResult =
    | {
          success: true;
          deletedLearningMaterialId: number;
          //add quiz and assignment here
      }
    | { success: false; reason: string };

type GetLearningMaterialsOfClassResult =
    | {
          success: true;
          learningMaterials: TypeSelectLearningMaterial[];
      }
    | { success: false; reason: string };

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
    const returnAttachments = await attachmentInLMService.getAttachmentsOfLearningMaterial({
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
    content: content,
    topicId,
    classId,
    inputResources,
    urls,
}: {
    title: string;
    content: string;
    topicId?: number;
    classId: number;
    inputResources?: IInputResource[];
    urls: string[];
}): Promise<LearningMaterialResult> => {
    let addedAttachments;
    if (inputResources) {
        //handle saving attachment
        addedAttachments = await attachmentService.handleInsertMultipleResources({ inputResources });
        //add relation here
    }

    const newLearningMaterial: TypeInsertLearningMaterial = {
        title,
        content,
        classId,
        topicId,
        urls,
    };
    const resultLearningMaterial = await insertLearningMaterial(newLearningMaterial);

    //add relations to attachment
    if (addedAttachments) {
        const result = await attachmentInLMService.linkMultipleAttachmentsToLearningMaterial({
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

export const editLearningMaterialService = async ({
    learningMaterial,
    inputResources,
}: {
    learningMaterial: Omit<TypeSelectLearningMaterial, 'createdAt'>;
    inputResources?: IInputResource[];

}): Promise<LearningMaterialResult> => {
    let addedAttachments;
    if (inputResources && inputResources.length > 0) {
        //handle saving attachment
        addedAttachments = await attachmentService.handleInsertMultipleResources({ inputResources });
    }
    if (addedAttachments && addedAttachments.length > 0) {
        const result = await attachmentInLMService.linkMultipleAttachmentsToLearningMaterial({
            learningMaterialId: learningMaterial.learningMaterialId,
            attachments: addedAttachments,
        });
    }

    const resultLearningMaterial = await updateLearningMaterial(learningMaterial);

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
    }

    if (resultAttachments.length > 0) {
        return {
            success: true,
            learningMaterialWithAttachments: {
                learningMaterial: resultLearningMaterial,
                attachments: resultAttachments,
            },
        };
    } else {
        return {
            success: true,
            learningMaterialWithAttachments: {
                learningMaterial: resultLearningMaterial,
            },
        };
    }
};

export const getLearningMaterialsOfClassService = async ({
    classId,
}: {
    classId: number;
}): Promise<GetLearningMaterialsOfClassResult> => {
    const resultLearningMaterials = await getLearningMaterialOfClass(classId);
    //get attachments

    if (!resultLearningMaterials) {
        return { success: false, reason: 'Internal server error' };
    } else {
        return {
            success: true,
            learningMaterials: resultLearningMaterials,
        };
    }
};

export const deleteLearningMaterialService = async ({
    learningMaterialId,
}: {
    learningMaterialId: number;
}): Promise<DeleteLearningMaterialResult> => {
    //delete attachments
    const deleteAttachmentResult = await attachmentInLMService.deleteAttachmentOfLearningMaterial({
        learningMaterialId,
    });

    if (!deleteAttachmentResult.success) {
        // Stop if deletion failed due to error
        throw new Error(`Failed to delete attachments: ${deleteAttachmentResult.reason}`);
    }
    try {
        //delete learningMaterial
        const deletedLearningMaterialId = await deleteLearningMaterialById({ learningMaterialId });
        return { success: true, deletedLearningMaterialId };
    } catch (error: any) {
        console.error('Failed to delete learning material:', error);
        return { success: false, reason: error?.message || 'Internal server error' };
    }
};
