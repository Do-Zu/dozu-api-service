import { EmbeddingInput, EmbeddingResult } from './embedding.type';

/**
 * Base strategy interface for different embedding types
 */
export interface IEmbeddingStrategy {
    process(input: EmbeddingInput): Promise<EmbeddingResult>;
    canHandle(input: EmbeddingInput): boolean;
}

const BASE_API_EMBEDDING_SERVICE = 'http://localhost:8686';

export abstract class BaseEmbeddingStrategy implements IEmbeddingStrategy {
    protected BASE_API_EMBEDDING_SERVICE_PROVIDER = BASE_API_EMBEDDING_SERVICE;
    /**
     * Check if this strategy can handle the given input
     */
    public abstract canHandle(payload: EmbeddingInput): boolean;

    /**
     * Process the input and generate embeddings
     */
    public abstract process(payload: EmbeddingInput): Promise<EmbeddingResult>;
}
