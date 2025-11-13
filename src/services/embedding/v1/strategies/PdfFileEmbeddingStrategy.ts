import { NewEmbedding } from '@/repositories/embedding/embedding.repo';
import { BaseEmbeddingStrategy } from '../BaseEmbeddingStrategy';
import {
    EmbeddingInputType,
    EmbeddingResult,
    EnumEmbeddingInput,
    FileMetaDataInput,
    EmbeddingInputRequest,
} from '../embedding.type';
import { compareIgnoreCapitalization, isNilOrEmpty } from '@/utils/common';
import { BadRequest, ServiceUnavailable } from '@/core/error';
import { uploadFileServiceOnR2 } from '@/services/uploads/files/upload.file.R2.service';
import logger from '@/utils/logger';
import { EnumContentSegmentType } from '@/models';

interface EmbeddingItemRes {
    pageNumber: number;
    charCount: number;
    embedding: number[];
}

class PdfFileEmbeddingService extends BaseEmbeddingStrategy {
    private API_END_POINT_EMBEDDING;

    constructor() {
        super();
        this.API_END_POINT_EMBEDDING = `${this.BASE_API_EMBEDDING_SERVICE_PROVIDER}/pdf/page/embedding`;
    }

    public canHandle(type: EmbeddingInputType): boolean {
        return compareIgnoreCapitalization(type, EnumEmbeddingInput.FILE);
    }

    public async process(payload: EmbeddingInputRequest): Promise<EmbeddingResult> {
        const { type, metadata, topicId } = payload;

        if (!metadata) {
            throw new BadRequest('Missing file metadata!');
        }

        const { fileKey } = metadata as FileMetaDataInput;

        if (isNilOrEmpty(fileKey)) throw new BadRequest('Miss File Key!');

        const fileContent = await uploadFileServiceOnR2.generateDownloadPresignedUrl(fileKey);

        if (isNilOrEmpty(fileContent)) {
            throw new ServiceUnavailable(' Input Set Service Unavailable');
        }

        const { downloadUrl } = fileContent;

        const { data } = await this.sendEventEmbedding({
            url: this.API_END_POINT_EMBEDDING,
            payload: {
                fileUrl: downloadUrl,
            },
        });

        const { embeddings, pageCount } = data as { pageCount: number; embeddings: EmbeddingItemRes[] };

        const listEmbeddingAdapter = this.adapterChunkItemAfterEmbedding({
            topicId,
            embeddings,
            type,
        });

        const storages = await this.storageVectorAfterEmbedding(listEmbeddingAdapter);

        return {
            type,
            pageCount,
            countEmbed: storages.length,
            data: storages,
        };
    }

    private adapterChunkItemAfterEmbedding({
        topicId,
        type,
        embeddings,
    }: {
        topicId: number;
        type: string;
        embeddings: EmbeddingItemRes[];
    }): NewEmbedding[] {
        try {
            if (!embeddings || embeddings.length === 0) return [];

            return embeddings.map(({ embedding: vector, pageNumber, charCount }, index) => ({
                contentType: type,
                embedding: vector,
                originContent: {
                    content: {
                        charCount,
                    },
                    type: EnumContentSegmentType.OBJECT,
                },
                metadata: {
                    pageNumber,
                },
                topicId,
                chunkIndex: index,
            }));
        } catch (error) {
            logger.error('File Embedding Service:  adapterChunkItemAfterEmbedding', error);
            return [];
        }
    }
}

export const pdfFileEmbeddingService = new PdfFileEmbeddingService();
