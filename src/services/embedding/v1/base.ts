import { IReturnItemQuery } from '@/repositories/embedding/embedding.repo';
import { EmbeddingInput, EmbeddingInputRequest, IQuerySimilarity } from './embedding.type';

export interface IBaseEmbeddingService {
    generateEmbedding(payload: EmbeddingInputRequest): Promise<any>;
}

export abstract class BaseEmbeddingService implements IBaseEmbeddingService {
    /**
     * Generate embeddings from input
     */
    public abstract generateEmbedding(payload: EmbeddingInputRequest): Promise<any>;

    /**
     * Validate input before processing
     */
    protected abstract validateInput(payload: EmbeddingInput): boolean;

    /**
     *
     * @param payload
     */
    public abstract queryTopSimilarity(payload: IQuerySimilarity): Promise<IReturnItemQuery[]>;
}
