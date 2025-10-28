import {
    attachmentInLearningMaterialTable,
    attachmentTable,
    TypeInsertAttachment,
    TypeSelectAttachment,
} from '@/models';
import db from '@/libs/drizzleClient.lib';
import { eq } from 'drizzle-orm';

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

export const getAttachmentsOfLearningMaterial = async ({
    learningMaterialId,
}: {
    learningMaterialId: number;
}): Promise<TypeSelectAttachment[]> => {
    const returnAttachments = await db
        .select({
            attachmentId: attachmentTable.attachmentId,
            title: attachmentTable.title,
            description: attachmentTable.description,
            contentType: attachmentTable.contentType,
            metadata: attachmentTable.metadata,
            createdAt: attachmentTable.createdAt,
        })
        .from(attachmentTable)
        .innerJoin(
            attachmentInLearningMaterialTable,
            eq(attachmentInLearningMaterialTable.attachmentId, attachmentTable.attachmentId)
        )
        .where(eq(attachmentInLearningMaterialTable.learningMaterialId, learningMaterialId));
    return returnAttachments;
};
