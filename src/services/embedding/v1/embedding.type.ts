interface EmbeddingResult extends Record<string, unknown> {}

const EnumEmbeddingInput = {
    TEXT: 'text',
    FILE: 'file',
    YOUTUBE: 'youtube',
};

type EmbeddingInputType = (typeof EnumEmbeddingInput)[keyof typeof EnumEmbeddingInput];

interface EmbeddingInput {
    type: EmbeddingInputType;
    metadata?: Record<string, unknown>;
}

interface EmbeddingInputRequest extends EmbeddingInput {
    topicId: number;
}

export type VideoMetadata = {
    startTime: number; // seconds
    index: number;
};

export type DocumentMetadata = {
    pageIndex: number;
    lineStart: number;
    lineEnd: number;
    chunkIndex: number;
    fileName?: string;
    fileType?: string;
};

export type EmbeddingMetadata = VideoMetadata | DocumentMetadata | Record<string, any>;

export { EmbeddingInputRequest, EmbeddingResult, EmbeddingInput, EmbeddingInputType, EnumEmbeddingInput };
