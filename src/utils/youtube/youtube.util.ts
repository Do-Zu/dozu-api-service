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
    /(?:youtu\.be|youtube\.com\/(?:embed|shorts|live))\/([A-Za-z0-9_-]{11})/i,
    /[?&]v=([A-Za-z0-9_-]{11})/i,
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

export const calculateAttributeEmbedding = (params: { duration: number; wordCount: number; lengthContent: number }) => {
    const { duration, wordCount, lengthContent } = params;

    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;

    const avgCharsPerWord = 5;

    const safeWords = wordCount > 0 ? wordCount : Math.max(0, Math.round((lengthContent as number) / avgCharsPerWord));

    // Helper
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

    // Words per second. Typical speech ~2.0–3.0 wps (120–180 wpm)
    const wps = safeDuration > 0 ? safeWords / safeDuration : 2.5;

    // Target segments per minute scales down as videos get longer
    let segmentsPerMinute: number;
    if (safeDuration <= 5 * 60) segmentsPerMinute = 2.0;
    else if (safeDuration <= 15 * 60) segmentsPerMinute = 1.6;
    else if (safeDuration <= 30 * 60) segmentsPerMinute = 1.3;
    else if (safeDuration <= 60 * 60) segmentsPerMinute = 1.1;
    else segmentsPerMinute = 0.9;

    // Compute target number of segments and bound them
    const minSegments = 8;
    const maxSegments = 100;
    const targetSegmentsRaw = safeDuration > 0 ? Math.ceil((safeDuration / 60) * segmentsPerMinute) : minSegments;
    const targetSegments = clamp(targetSegmentsRaw, minSegments, maxSegments);

    // Derive minLength (now: words) so that totalWords / minWords ~= targetSegments
    // Clamp to keep each segment reasonable
    const minWordsLowerBound = 30;
    const minWordsUpperBound = 180;
    const targetMinWordsRaw = targetSegments > 0 ? Math.ceil(safeWords / targetSegments) : minWordsLowerBound;
    const minLength = clamp(targetMinWordsRaw, minWordsLowerBound, minWordsUpperBound);

    // Base maxGap by duration bucket (seconds)
    let baseMaxGap: number;
    if (safeDuration <= 5 * 60) baseMaxGap = 2.2;
    else if (safeDuration <= 15 * 60) baseMaxGap = 2.6;
    else if (safeDuration <= 30 * 60) baseMaxGap = 2.9;
    else if (safeDuration <= 60 * 60) baseMaxGap = 3.2;
    else if (safeDuration <= 2 * 60 * 60) baseMaxGap = 3.6;
    else baseMaxGap = 4.0;

    // Adjust maxGap by speech rate:
    // Faster speech (higher wps) → smaller gap. Slower speech → larger gap.
    const wpsRef = 2.5;
    const densityFactor = clamp(wpsRef / Math.max(wps, 1e-6), 0.8, 1.3);
    const maxGap = clamp(baseMaxGap * densityFactor, 1.8, 5.0);

    return { maxGap, minLength };
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
