import axios from 'axios';
import { embeddingRepo, IReturnItemQuery, NewEmbedding } from '@/repositories/embedding/embedding.repo';
import {
    EmbeddingInput,
    EmbeddingInputRequest,
    EmbeddingInputType,
    EmbeddingResult,
    IQuerySimilarity,
} from './embedding.type';
import { isEmpty, isNilOrEmpty } from '@/utils/common';
import { BadRequest, ServiceUnavailable } from '@/core/error';
import { HTTP_STATUS } from '@/constants/index.constant';
import { TypeMetaDataChunkEmbed } from '@/models/embedding';
import logger from '@/utils/logger';

/**
 * Base strategy interface for different embedding types
 */
export interface IEmbeddingStrategy {
    process(input: EmbeddingInput): Promise<EmbeddingResult>;
    canHandle(input: EmbeddingInputType): boolean;
    queryTopSimilarity(payload: IQuerySimilarity): Promise<IReturnItemQuery[]>;
}

const BASE_API_EMBEDDING_SERVICE = process.env.EMBEDDING_API_URL;

export abstract class BaseEmbeddingStrategy implements IEmbeddingStrategy {
    protected BASE_API_EMBEDDING_SERVICE_PROVIDER;

    constructor() {
        this.init();
        this.BASE_API_EMBEDDING_SERVICE_PROVIDER = BASE_API_EMBEDDING_SERVICE;
    }

    private init() {
        if (isNilOrEmpty(BASE_API_EMBEDDING_SERVICE)) {
            logger.error('Missing BASE_API_EMBEDDING_SERVICE');
        }
    }

    /**
     * Check if this strategy can handle the given input
     */
    public abstract canHandle(type: EmbeddingInputType): boolean;

    /**
     * Process the input and generate embeddings
     */
    public abstract process(payload: EmbeddingInputRequest): Promise<EmbeddingResult>;

    /**
     *
     * @param payload IQuerySimilarity
     */
    public async queryTopSimilarity(payload: IQuerySimilarity): Promise<IReturnItemQuery[]> {
        try {
            const { query, topicId, topK } = payload;

            const { data, status } = await axios.post(
                `${this.BASE_API_EMBEDDING_SERVICE_PROVIDER}/single/text/embedding`,
                {
                    query,
                }
            );

            if (status !== HTTP_STATUS.OK) {
                throw new BadRequest('Failed to generate query embedding');
            }

            const queryEmbedding = data?.embedding as number[];

            const similarEmbeddings = await embeddingRepo.findSimilarEmbeddings({ queryEmbedding, topicId, topK });

            const results: IReturnItemQuery[] = similarEmbeddings.map(item => ({
                embeddingId: item.embeddingId,
                topicId: item.topicId,
                contentType: item.contentType,
                originContent: item.originContent as TypeMetaDataChunkEmbed,
                metadata: item.metadata,
                createdAt: item.createdAt,
                similarity: item.similarity,
            }));

            return results;
        } catch (error) {
            logger.error('YoutubeEmbeddingService: queryTopSimilarity ', error);
            throw error;
        }
    }

    /**
     *
     */
    protected async sendEventEmbedding({ url, payload }: { url: string; payload: Record<string, unknown> }) {
        const { data, status, statusText } = await axios.post(url, payload);

        if (status !== HTTP_STATUS.OK) {
            throw new ServiceUnavailable(statusText);
        }

        return { data, status, statusText };
    }

    /**
     * Store Embedding
     */
    protected async storageVectorAfterEmbedding(data: NewEmbedding[]) {
        if (isEmpty(data)) return [];
        return await embeddingRepo.insertEmbeddingsBatch(data);
    }
}
