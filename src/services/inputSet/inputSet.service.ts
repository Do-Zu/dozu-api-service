import { InternalServerError } from '@/core/error';
import { getInputSetByTopicId } from '@/repositories/inputSet.repo';
import { uploadFileServiceOnR2 } from '../uploads/files/upload.file.R2.service';

export const getDocumentService = async (topicId: number) => {
    const inputSet = await getInputSetByTopicId(topicId);

    if (!inputSet) {
        throw new InternalServerError('Input set not found for the given topicId');
    }

    const { metadata, setId, contentType, description, title } = inputSet;

    const fileContent = await handleGetFile({ metadata } as { metadata: { fileKey: string } });

    return {
        setId,
        contentType,
        description,
        title,
        fileUrl: fileContent.downloadUrl,
        expiresIn: fileContent.expiresIn,
    };
};

const handleGetFile = async ({ metadata }: { metadata: { fileKey: string } }) => {
    if (!metadata?.fileKey) {
        throw new InternalServerError('File key is missing');
    }

    const fileContent = await uploadFileServiceOnR2.generateDownloadPresignedUrl(metadata.fileKey);

    if (!fileContent) {
        throw new InternalServerError('Failed to retrieve file content');
    }

    return fileContent;
};
