import {
    attachmentInLearningMaterialTable,
    attachmentTable,
    TypeInsertAttachment,
    TypeSelectAttachment,
} from '@/models';
import db from '@/libs/drizzleClient.lib';

export const insertAttachment = async (newAttachment: TypeInsertAttachment): Promise<TypeSelectAttachment> => {
    const [insertedAttachment] = await db.insert(attachmentTable).values(newAttachment).returning();
    return insertedAttachment;
};

export const insertMultipleAttachments = async (
    newAttachments: TypeInsertAttachment[]
): Promise<TypeSelectAttachment[]> => {
    const insertedAttachments = await db.insert(attachmentTable).values(newAttachments).returning();
    return insertedAttachments;
};

export const addAttachmentsToLearningMaterial = async (
    data: { attachmentId: number; learningMaterialId: number }[]
) => {
    const addedAttachmentInfos = await db.insert(attachmentInLearningMaterialTable).values(data).returning({
        attachmentId: attachmentInLearningMaterialTable.attachmentId,
        learningMaterialId: attachmentInLearningMaterialTable.learningMaterialId,
    });
    return addedAttachmentInfos;
};
