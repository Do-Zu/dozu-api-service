interface IYoutubeCaptionSegment {
    text: string;
    startSecond: number;
    startMs: number;
    endSecond?: number;
    endMs?: number;
    duration?: number;
}

interface IEmbedVideoInfo {
    iframe_url: string;
    flash_url: string;
    flash_secure_url: string;
    width: number;
    height: number;
}

interface VideoInfo {
    title: string;
    thumbnailUrl: string;
    videoId: string;
    duration: number;
    embed: IEmbedVideoInfo;
}

interface YoutubeResourceMetadata {
    url: string;
    videoId: string;
    videoInfo: VideoInfo;
    content: string | IBalancedSegment[];
    lengthContent: number;
    wordCount: number;
    segments: IYoutubeCaptionSegment[];
}

interface IBalancedSegment {
    startTime: number;
    endTime: number;
    text: string;
}

export { YoutubeResourceMetadata, IYoutubeCaptionSegment, IBalancedSegment, VideoInfo };
