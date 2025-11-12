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

export const calculateAttributeEmbedding = ({
    lengthContent,
    duration,
}: {
    lengthContent: number;
    duration: number;
}) => {
    // Guards
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0; // seconds
    const safeLength = Number.isFinite(lengthContent) && lengthContent > 0 ? lengthContent : 0; // chars

    // Helper
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

    // Estimate speech density (chars/sec). Typical YouTube speech ~10–18 char/s.
    const density = safeDuration > 0 ? safeLength / safeDuration : 12;

    // Target segments per minute scales down as videos get longer
    // Short → finer, Long → coarser
    let segmentsPerMinute: number;
    if (safeDuration <= 5 * 60) segmentsPerMinute = 2.0;
    else if (safeDuration <= 15 * 60) segmentsPerMinute = 1.6;
    else if (safeDuration <= 30 * 60) segmentsPerMinute = 1.4;
    else if (safeDuration <= 60 * 60) segmentsPerMinute = 1.2;
    else segmentsPerMinute = 1.0;

    // Compute target number of segments and bound them
    // You can tune these bounds to control cost/perf
    const minSegments = 8;
    const maxSegments = 120;
    const targetSegmentsRaw = safeDuration > 0 ? Math.ceil((safeDuration / 60) * segmentsPerMinute) : minSegments;
    const targetSegments = clamp(targetSegmentsRaw, minSegments, maxSegments);

    // Derive minLength so that total chars / minLength ~= targetSegments
    // Clamp to keep each segment not too tiny or too huge
    const minLengthLowerBound = 80; // short segments lower bound
    const minLengthUpperBound = 320; // long segments upper bound
    const targetMinLengthRaw = targetSegments > 0 ? Math.ceil(safeLength / targetSegments) : minLengthLowerBound;
    const minLength = clamp(targetMinLengthRaw, minLengthLowerBound, minLengthUpperBound);

    // Base maxGap by duration bucket (seconds)
    let baseMaxGap: number;
    if (safeDuration <= 5 * 60) baseMaxGap = 2.8;
    else if (safeDuration <= 15 * 60) baseMaxGap = 2.85;
    else if (safeDuration <= 30 * 60) baseMaxGap = 2.9;
    else if (safeDuration <= 60 * 60) baseMaxGap = 2.95;
    else if (safeDuration <= 2 * 60 * 60) baseMaxGap = 3.0;
    else baseMaxGap = 3.05;

    // Adjust maxGap by speech density:
    // Faster speech (higher density) → smaller gap (more natural breaks)
    // Slower speech → larger gap to merge across silences
    // densityRef ~12 char/s; clamp the adjustment to avoid big swings
    const densityRef = 12;
    const densityFactor = clamp(densityRef / Math.max(density, 1e-6), 0.85, 1.2);
    const maxGap = clamp(baseMaxGap * densityFactor, 1.8, 4.5);

    return {
        maxGap,
        minLength,
    };
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
