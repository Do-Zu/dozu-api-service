import { BadRequest } from '@/core/error';

// Common YouTube URL patterns we support
// Examples:
// https://www.youtube.com/watch?v=VIDEO_ID
// https://youtu.be/VIDEO_ID
// https://www.youtube.com/embed/VIDEO_ID
// https://www.youtube.com/shorts/VIDEO_ID
// https://www.youtube.com/live/VIDEO_ID?feature=share
// https://youtube.com/watch?v=VIDEO_ID&ab_channel=...

const YT_REGEXES: RegExp[] = [
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i,
    /v=([A-Za-z0-9_-]{11})/i,
];

export const extractYoutubeVideoId = (input?: string | null): string => {
    if (!input) throw new BadRequest('A YouTube videoId or url is required');
    const trimmed = input.trim();

    // If already looks like a bare videoId
    if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

    for (const rx of YT_REGEXES) {
        const match = trimmed.match(rx);
        if (match && match[1]) return match[1];
    }

    throw new BadRequest('Unable to extract YouTube videoId from provided url');
};

export interface IYoutubeSegment {
    title: string;
    startMs: number;
    endMs: number;
    durationMs: number;
}

export interface IYoutubeCaptionSegment {
    startMs: number;
    startSecond: number;
    endMs?: number;
    durationMs?: number;
    text: string;
}
