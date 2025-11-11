import axios from 'axios';
import { youtubeContentService } from '@/services/content/youtube.content.service';
import { BaseEmbeddingStrategy } from '../BaseEmbeddingStrategy';
import { EmbeddingInput, EmbeddingInputRequest, EmbeddingResult, EnumEmbeddingInput } from '../embedding.type';
import { BadRequest } from '@/core/error';
import logger from '@/utils/logger';
import { isNilOrEmpty, toNumber } from '@/utils/common';
import { NewEmbedding } from '@/repositories/embedding/embedding.repo';
import { isEmpty } from 'bullmq';

interface EmbeddingItemRes {
    start: number;
    text: string;
    embedding: number[];
}
class YoutubeEmbeddingService extends BaseEmbeddingStrategy {
    private API_END_POINT_EMBEDDING;

    constructor() {
        super();
        this.API_END_POINT_EMBEDDING = `${this.BASE_API_EMBEDDING_SERVICE_PROVIDER}/youtube/segments/embedding`;
    }

    public canHandle(payload: EmbeddingInput): boolean {
        const { type } = payload;

        return type === EnumEmbeddingInput.YOUTUBE;
    }

    private async getYoutubeTranscript({ videoId }: { videoId: string }) {
        return await youtubeContentService.getTranscript({ videoId });
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
            if (isEmpty(embeddings)) return [];

            return embeddings?.map(({ embedding: vector, start, text }, index) => ({
                contentType: type,
                embedding: vector,
                originContent: {
                    content: text,
                    type: 'text',
                },
                metadata: {
                    startTime: start,
                },
                topicId,
                chunkIndex: index,
            }));
        } catch (error) {
            logger.error('YoutubeEmbedding Service:  adapterChunkItemAfterEmbedding', error);
            return [];
        }
    }

    public async process(payload: EmbeddingInputRequest): Promise<EmbeddingResult> {
        try {
            const { topicId, type, metadata } = payload;

            const videoId = metadata?.videoId as string;
            const maxGap = toNumber(metadata?.max_gap, 2);
            const minLength = toNumber(metadata?.min_length, 10);

            if (isNilOrEmpty(videoId)) {
                throw new BadRequest('Video Id Invalid');
            }

            const { segments } = await this.getYoutubeTranscript({ videoId });

            const { data, status, statusText } = await axios.post(this.API_END_POINT_EMBEDDING, {
                videoId,
                segments,
                max_gap: maxGap,
                min_length: minLength,
            });

            if (status !== 200) throw new BadRequest(statusText);

            const embeddings = (data as { count: number; embeddings: EmbeddingItemRes[] }).embeddings;

            const listEmbeddingAdapter = this.adapterChunkItemAfterEmbedding({
                topicId,
                embeddings,
                type,
            });

            const storages = await this.storageVectorAfterEmbedding(listEmbeddingAdapter);

            return {
                type,
                metadata,
                data: storages,
            };
        } catch (error) {
            logger.error('YoutubeEmbeddingService: process ', error);
            throw error;
        }
    }
}

export const youtubeEmbeddingService = new YoutubeEmbeddingService();
