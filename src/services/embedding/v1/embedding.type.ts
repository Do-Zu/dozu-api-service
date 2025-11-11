interface EmbeddingInputReq {
    text: string;
    metadata: Record<string, unknown>;
}

interface EmbeddingResult extends Record<string, unknown> {}

const EnumEmbeddingInput = {
    TEXT: 'text',
    FILE: 'file',
    YOUTUBE: 'youtube',
};

type EmbeddingInputType = (typeof EnumEmbeddingInput)[keyof typeof EnumEmbeddingInput];

interface EmbeddingInput {
    type: EmbeddingInputType;
    segments: EmbeddingInputReq[];
    metadata?: Record<string, unknown>;
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

export { EmbeddingInputReq, EmbeddingResult, EmbeddingInput, EmbeddingInputType, EnumEmbeddingInput };
