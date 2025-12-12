import { UploadFileResponse, YoutubeResourceMetadata } from '@/services/inputSet/types/inputSet.type';

interface EmbeddingResult extends Record<string, unknown> {}

const EnumEmbeddingInput = {
    TEXT: 'text',
    FILE: 'file',
    YOUTUBE: 'youtube',
};

type EmbeddingInputType = (typeof EnumEmbeddingInput)[keyof typeof EnumEmbeddingInput];

type MetaDataInputEmbedding = Record<string, unknown> | YoutubeResourceMetadata | UploadFileResponse;
interface EmbeddingInput {
    type: EmbeddingInputType;
    metadata?: MetaDataInputEmbedding;
}

interface EmbeddingInputRequest extends EmbeddingInput {
    topicId: number;
}

interface IQuerySimilarity {
    type: EmbeddingInputType;
    query: string;
    topicId: number;
    topK?: number;
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

export {
    IQuerySimilarity,
    EmbeddingInputRequest,
    EmbeddingResult,
    EmbeddingInput,
    EmbeddingInputType,
    MetaDataInputEmbedding,
    EnumEmbeddingInput,
};
