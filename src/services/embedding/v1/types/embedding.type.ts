interface CompareEmbeddingRequest {
    pattern: string;
    query: string;
}

interface CompareEmbeddingResponse {
    similarity: number;
    queryEmbedding: number[];
    patternEmbedding: number[];
}

export type { CompareEmbeddingRequest, CompareEmbeddingResponse };
