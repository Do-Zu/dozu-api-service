import { YoutubeResourceMetadata } from '@/types/youtube/youtube.type';

interface UploadFileResponse {
    id?: string;
    fileName: string;
    originalName: string;
    filePath?: string;
    fileSize: number;
    mimeType?: string;
    status: 'completed' | 'processing' | 'failed';
    uploadedAt?: string;
    setId?: string;
    fileKey: string;
}

type WebsiteResourceMetadata = {
    url: string;
    content: string;
};

type TextResourceMetadata = {
    content: string;
};

type MetaDataInputSet = UploadFileResponse | YoutubeResourceMetadata | WebsiteResourceMetadata | TextResourceMetadata;

type TopicId = number;

const RESOURCE_CONTENT_TYPE = {
    FILE: 'file',
    YOUTUBE: 'youtube',
    WEBSITE: 'website',
    TEXT: 'text',
} as const;

type ResourceContentType = (typeof RESOURCE_CONTENT_TYPE)[keyof typeof RESOURCE_CONTENT_TYPE];

export {
    TopicId,
    MetaDataInputSet,
    YoutubeResourceMetadata,
    WebsiteResourceMetadata,
    TextResourceMetadata,
    UploadFileResponse,
    RESOURCE_CONTENT_TYPE,
    ResourceContentType,
};
