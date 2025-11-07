import { InternalServerError } from '@/core/error';
import { getInputSetByTopicId, insertInputSet } from '@/repositories/inputSet.repo';
import { uploadFileServiceOnR2 } from '../uploads/files/upload.file.R2.service';
import { checkAndConvertToString } from '@/utils/common';

class InputSetService {
    public getDocumentService = async (topicId: number) => {
        const inputSet = await getInputSetByTopicId(topicId);

        if (!inputSet) {
            throw new InternalServerError('Input set not found for the given topicId');
        }

        const { metadata, setId, contentType, description, title } = inputSet;
        // returned data
        let data: any;
        if (contentType === 'file') {
            const fileContent = await this.handleGetFile({ metadata } as { metadata: { fileKey: string } });

            if (!fileContent) {
                throw new InternalServerError('Error: Document does not exist');
            }
            data = {
                fileUrl: fileContent.downloadUrl,
                expiresIn: fileContent.expiresIn,
            };
        } else if (contentType === 'youtube') {
            const { url, content, videoInfo } = metadata as {
                url?: string | null | undefined;
                content?: string | null | undefined;
                videoInfo?: { videoId: string } | null | undefined;
            };
            if (
                url === null ||
                url === undefined ||
                content === null ||
                content === undefined ||
                videoInfo === null ||
                videoInfo === undefined
            ) {
                throw new InternalServerError('Error: Youtube content does not exist');
            }
            data = { url, content, videoInfo };
        } else {
            throw new Error(`Error: Content type ${contentType} is not supported yet.`);
        }

        return {
            setId,
            contentType,
            description,
            title,
            data,
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
        title,
    }: {
        userId: number;
        topicId: number;
        contentType: string;
        metadata: object;
        title?: string;
    }) => {
        const result = await insertInputSet({
            userId,
            topicId,
            title: checkAndConvertToString(title),
            contentType,
            metadata,
        });
        return result;
    };
}

export const inputSetService = new InputSetService();
