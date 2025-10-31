// import { InternalServerError } from '@/core/error';
import {
    insertAttachment,
    insertMultipleAttachments,
} from '@/repositories/class-based-learning/attachment/attachment.repo';
// import { uploadFileServiceOnR2 } from '../uploads/files/upload.file.R2.service';
import { checkAndConvertToString } from '@/utils/common';

interface IInputResource {
    contentType: string;
    metadata: object;
    title?: string;
}

class AttachmentService {
    // public getDocumentService = async (topicId: number) => {
    //     const inputSet = await getInputSetByTopicId(topicId);

    //     if (!inputSet) {
    //         throw new InternalServerError('Input set not found for the given topicId');
    //     }

    //     const { metadata, setId, contentType, description, title } = inputSet;

    //     const fileContent = await this.handleGetFile({ metadata } as { metadata: { fileKey: string } });

    //     if (!fileContent) {
    //         throw new InternalServerError('Error: Document does not exist');
    //     }

    //     return {
    //         setId,
    //         contentType,
    //         description,
    //         title,
    //         fileUrl: fileContent.downloadUrl,
    //         expiresIn: fileContent.expiresIn,
    //     };
    // };

    /**
     *
     * @param param0  { metadata: { fileKey: string }
     * @returns file content
     */
    // private handleGetFile = async ({ metadata }: { metadata: { fileKey: string } }) => {
    //     if (!metadata?.fileKey) {
    //         throw new InternalServerError('File key is missing');
    //     }

    //     const fileContent = await uploadFileServiceOnR2.generateDownloadPresignedUrl(metadata.fileKey);

    //     if (!fileContent) {
    //         throw new InternalServerError('Failed to retrieve file content');
    //     }

    //     return fileContent;
    // };

    public handleInsertResource = async ({
        contentType,
        metadata,
        title,
    }: {
        contentType: string;
        metadata: object;
        title?: string;
    }) => {
        const result = await insertAttachment({
            title: checkAndConvertToString(title),
            contentType,
            metadata,
        });
        return result;
    };

    public handleInsertMultipleResources = async ({ inputResources }: { inputResources: IInputResource[] }) => {
        const insertInputs = inputResources.map(input => ({
            // title: checkAndConvertToString(input.title),
            title: input.title ?? '',
            contentType: input.contentType,
            metadata: input.metadata,
        }));
        const result = await insertMultipleAttachments(insertInputs);
        return result;
    };

 
}

export const attachmentService = new AttachmentService();
