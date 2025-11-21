import {
    attachmentInLearningMaterialTable,
    attachmentTable,
    TypeInsertAttachment,
    TypeSelectAttachment,
} from '@/models';
import db from '@/libs/drizzleClient.lib';
import { eq, inArray } from 'drizzle-orm';

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

export const getAttachmentIdsOfLearningMaterial = async ({
    learningMaterialId,
}: {
    learningMaterialId: number;
}): Promise<number[]> => {
    const returnAttachmentIds = await db
        .select({
            attachmentId: attachmentTable.attachmentId,
        })
        .from(attachmentTable)
        .innerJoin(
            attachmentInLearningMaterialTable,
            eq(attachmentInLearningMaterialTable.attachmentId, attachmentTable.attachmentId)
        )
        .where(eq(attachmentInLearningMaterialTable.learningMaterialId, learningMaterialId));
    return returnAttachmentIds.map(row => row.attachmentId);
};

export const deleteMultipleAttachments = async ({ attachmentIds }: { attachmentIds: number[] }): Promise<number> => {
    const deletedAttachments = await db
        .delete(attachmentTable)
        .where(inArray(attachmentTable.attachmentId, attachmentIds))
        .returning({ attachmentId: attachmentTable.attachmentId });
    return deletedAttachments.length;
};
