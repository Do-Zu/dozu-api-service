import { InternalServerError } from '@/core/error';
import { getInputSetByTopicId, insertInputSet } from '@/repositories/inputSet.repo';
import { uploadFileServiceOnR2 } from '../uploads/files/upload.file.R2.service';

class InputSetService {
    public getDocumentService = async (topicId: number) => {
        const inputSet = await getInputSetByTopicId(topicId);

        if (!inputSet) {
            throw new InternalServerError('Input set not found for the given topicId');
        }

        const { metadata, setId, contentType, description, title } = inputSet;

        const fileContent = await this.handleGetFile({ metadata } as { metadata: { fileKey: string } });

        if (!fileContent) {
            throw new InternalServerError('Error: Document does not exist');
        }

        return {
            setId,
            contentType,
            description,
            title,
            fileUrl: fileContent.downloadUrl,
            expiresIn: fileContent.expiresIn,
        };
    };

    /**
     *
     * @param param0  { metadata: { fileKey: string }
     * @returns file content
     */
    private handleGetFile = async ({ metadata }: { metadata: { fileKey: string } }) => {
        if (!metadata?.fileKey) {
            throw new InternalServerError('File key is missing');
        }

        const fileContent = await uploadFileServiceOnR2.generateDownloadPresignedUrl(metadata.fileKey);

        if (!fileContent) {
            throw new InternalServerError('Failed to retrieve file content');
        }

        return fileContent;
    };

    public handleInsertResource = async ({
        userId,
        topicId,
        contentType,
        metadata,
    }: {
        userId: number;
        topicId: number;
        contentType: string;
        metadata: object;
    }) => {
        const result = await insertInputSet({
            userId,
            topicId,
            title: '',
            contentType,
            metadata,
        });
        return result;
    };
}

export const inputSetService = new InputSetService();
