import { EmbeddingInput } from './embedding.type';

export interface IBaseEmbeddingService {
    generateEmbedding(payload: EmbeddingInput): Promise<any>;
}

export abstract class BaseEmbeddingService implements IBaseEmbeddingService {
    /**
     * Generate embeddings from input
     */
    public abstract generateEmbedding(payload: EmbeddingInput): Promise<any>;

    /**
     * Validate input before processing
     */
    protected abstract validateInput(payload: EmbeddingInput): boolean;
}
