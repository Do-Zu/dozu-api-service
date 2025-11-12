export interface IYoutubeMetadata {
    title: string;
    duration: number;
    author: string;
    views: number;
    thumbnailUrl: string;
    embed:
        | {
              iframe_url: string;
              flash_url: string;
              flash_secure_url: string;
              width: any;
              height: any;
          }
        | null
        | undefined;
}

export interface IBalancedSegment {
    startTime: number;
    endTime: number;
    text: string;
}
