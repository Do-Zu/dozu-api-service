import logger from '@/utils/logger';
import Innertube from 'youtubei.js';
import { IBalancedSegment, IYoutubeMetadata } from '../../types/youtube/youtube.type';

class YoutubeService {
    public async getYoutubeContent({
        videoId,
    }: {
        videoId: string;
    }): Promise<{ metadata: IYoutubeMetadata; balancedSegments: IBalancedSegment[]; fullTranscript: string }> {
        try {
            const youtube = await Innertube.create({
                lang: 'en',
                location: 'US',
                retrieve_player: false,
            });

            const info = await youtube.getInfo(videoId);

            if (!info) {
                throw new Error('Could not retrieve video information');
            }

            const metadata: IYoutubeMetadata = {
                title: info.basic_info.title || 'Unknown title',
                duration: info.basic_info.duration || 0,
                author: info.basic_info.author || 'Unknown author',
                views: info.basic_info.view_count || 0,
                thumbnailUrl: info.basic_info.thumbnail?.[0].url || '',
                embed: info.basic_info.embed,
            };

            try {
                const transcriptData = await info.getTranscript();
                const initialSegments = transcriptData.transcript.content?.body?.initial_segments;

                if (!transcriptData || !initialSegments) {
                    throw new Error('This video does not have captions available');
                }

                const transcriptSegments = initialSegments.map((segment: any) => ({
                    text: segment.snippet.text as string | undefined,
                    startTime: segment.start_ms ? Math.floor(segment.start_ms / 1000) : 0,
                    endTime: segment.end_ms ? Math.floor(segment.end_ms / 1000) : 0,
                }));

                const fullTranscript = transcriptSegments
                    .filter(segment => segment.text !== undefined)
                    .map(segment => segment.text)
                    .join(' ')
                    .replace(/[\u200B-\u200D\uFEFF]/g, '')
                    .replace(/\s+/g, ' ');

                const result: IBalancedSegment[] = [];
                const fullTranscriptLength = fullTranscript.length;
                const maximumSegnmentLength = Math.min(fullTranscriptLength / 10, 500); // full transcript is divided into 10 separate parts
                let startTime: number = 0,
                    endTime: number = 0,
                    arrayOfText: string[] = [],
                    currentLength = 0;
                for (const segment of transcriptSegments) {
                    if (arrayOfText.length === 0) startTime = segment.startTime;
                    endTime = segment.endTime;
                    if (!segment.text) continue;
                    const cleanedText = segment.text.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
                    arrayOfText.push(cleanedText);
                    currentLength += cleanedText.length;
                    if (currentLength > maximumSegnmentLength) {
                        result.push({
                            startTime,
                            endTime,
                            text: arrayOfText.join(' '),
                        });
                        startTime = 0;
                        currentLength = 0;
                        arrayOfText = [];
                    }
                }
                if (arrayOfText.length > 0) {
                    result.push({
                        startTime,
                        endTime,
                        text: arrayOfText.join(' '),
                    });
                }
                return { metadata, balancedSegments: result, fullTranscript };
            } catch (err) {
                logger.error('Failed to retrieve transcript from YouTube video:', err);
                throw new Error('Failed to retrieve transcript from YouTube video');
            }
        } catch (err) {
            logger.error('Failed to retrieve transcript from YouTube video:', err);
            throw new Error('Failed to retrieve transcript from YouTube video');
        }
    }
}

export default new YoutubeService();
