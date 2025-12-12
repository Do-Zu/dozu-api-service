import { BadRequest, InternalServerError } from '@/core/error';
import { getInputSetByTopicId, insertInputSet } from '@/repositories/inputSet.repo';
import { uploadFileServiceOnR2 } from '../uploads/files/upload.file.R2.service';
import youtubeService from '../youtube/youtube.service';
import { embeddingService } from '../embedding/v1/embedding.service';
import { MetaDataInputEmbedding } from '../embedding/v1/embedding.type';
import { IBalancedSegment } from '@/types/youtube/youtube.type';
import {
    MetaDataInputSet,
    RESOURCE_CONTENT_TYPE,
    ResourceContentType,
    TextResourceMetadata,
    TopicId,
    UploadFileResponse,
    WebsiteResourceMetadata,
    YoutubeResourceMetadata,
} from './types/inputSet.type';
import { checkAndConvertToString, isEmpty, isNilOrEmpty, safeDestructure } from '@/utils/common';

class InputSetService {
    public getDocumentService = async (topicId: number) => {
        const inputSet = await getInputSetByTopicId(topicId);

        if (!inputSet) {
            throw new InternalServerError('Input set not found for the given topicId');
        }

        const { metadata, setId, contentType, description, title } = inputSet;

        let data;

        if (contentType === RESOURCE_CONTENT_TYPE.FILE) {
            const fileContent = await this.handleGetFile({ metadata } as { metadata: { fileKey: string } });

            if (!fileContent) {
                throw new InternalServerError('Error: Document does not exist');
            }

            data = {
                fileUrl: fileContent.downloadUrl,
                expiresIn: fileContent.expiresIn,
            };
        } else if (contentType === RESOURCE_CONTENT_TYPE.YOUTUBE) {
            const { url, content, videoInfo } = metadata as {
                url?: string | null | undefined;
                content?: string | IBalancedSegment[] | null | undefined;
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
        metadata: MetaDataInputSet;
        contentType: ResourceContentType;
        title?: string;
    }) => {
        // Storage input set of topic
        const formattedMetadata = await this.convertYoutubeContentToBalancedSegments({ metadata, contentType });

        const inputSet = await insertInputSet({
            userId,
            topicId,
            title: checkAndConvertToString(title),
            contentType,
            metadata: formattedMetadata,
        });

        const parseMetaDataBelongTypeForEmbedding = this.resolveResourceMetadata({
            topicId,
            contentType,
            payload: metadata,
        });

        if (isNilOrEmpty(parseMetaDataBelongTypeForEmbedding)) {
            throw new BadRequest('Parse Embedding Data Error');
        }

        // Processing embedding and store vector
        const embedding = await embeddingService.generateEmbedding({
            topicId,
            type: contentType,
            metadata: parseMetaDataBelongTypeForEmbedding!,
        });

        return {
            inputSet,
            embedding,
        };
    };

    private resolveResourceMetadata(params: {
        topicId: TopicId;
        contentType: ResourceContentType;
        payload: MetaDataInputSet;
    }): MetaDataInputEmbedding | null {
        switch (params.contentType) {
            case RESOURCE_CONTENT_TYPE.FILE: {
                return { ...(params.payload as UploadFileResponse) };
            }
            case RESOURCE_CONTENT_TYPE.YOUTUBE: {
                if (isEmpty(params.payload)) {
                    return null;
                }

                return { ...(params.payload as YoutubeResourceMetadata) };
            }
            case RESOURCE_CONTENT_TYPE.WEBSITE: {
                const { url, content } = params.payload as WebsiteResourceMetadata;

                if (!url || !content) return null;

                return { url, content };
            }
            case RESOURCE_CONTENT_TYPE.TEXT: {
                const { content } = params.payload as TextResourceMetadata;

                if (!content) return null;

                return { content };
            }
            default:
                return null;
        }
    }

    // if contentType is Youtube, convert its content in metadata to balanced segments that are executed in youtube service. It not, return initial metadata
    private async convertYoutubeContentToBalancedSegments({
        metadata,
        contentType,
    }: {
        metadata: MetaDataInputSet;
        contentType: ResourceContentType;
    }) {
        if (contentType !== RESOURCE_CONTENT_TYPE.YOUTUBE) {
            return metadata;
        }
        const { content, segments } = safeDestructure(metadata) as YoutubeResourceMetadata;

        try {
            const balancedSegments = youtubeService.generateBalanceSegment({
                transcriptSegments: segments,
                lengthTranscript: content?.length,
            });

            return {
                ...metadata,
                content: balancedSegments,
            };
        } catch (error) {
            throw new InternalServerError(`Failed to convert YouTube content to balanced segments: ${error}`);
        }
    }
}

export const inputSetService = new InputSetService();
