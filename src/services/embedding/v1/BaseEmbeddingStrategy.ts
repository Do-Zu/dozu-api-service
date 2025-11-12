import { embeddingRepo, IReturnItemQuery, NewEmbedding } from '@/repositories/embedding/embedding.repo';
import { EmbeddingInput, EmbeddingInputType, EmbeddingResult, IQuerySimilarity } from './embedding.type';
import { isEmpty, isNilOrEmpty } from '@/utils/common';
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
    public abstract process(payload: EmbeddingInput): Promise<EmbeddingResult>;

    /**
     *
     * @param payload
     */
    public abstract queryTopSimilarity(payload: IQuerySimilarity): Promise<IReturnItemQuery[]>;

    /**
     * Store Embedding
     */
    protected async storageVectorAfterEmbedding(data: NewEmbedding[]) {
        if (isEmpty(data)) return [];
        return await embeddingRepo.insertEmbeddingsBatch(data);
    }
}
