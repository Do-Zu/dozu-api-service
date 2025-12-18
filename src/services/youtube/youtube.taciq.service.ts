import axios from 'axios';
import { safeDestructure, toNumber } from '@/utils/common';

class YoutubeTacIqService {
    private readonly API_BASE = 'https://tactiq-apps-prod.tactiq.io/transcript';

    public async getTranscriptSegment({ url, lang }: { url: string; lang?: string }) {
        const { data } = await axios.post<{
            title: string;
            captions: { dur: string; start: string; text: string }[];
        }>(this.API_BASE, {
            videoUrl: url,
            lang,
        });

        const { captions, title } = safeDestructure(data);

        const segments = captions?.map(item => {
            const start = toNumber(item.start);
            const duration = toNumber(item.dur);
            const end = start + duration;

            return {
                text: item.text,
                startMs: start * 1000,
                endMs: end * 1000,
                startSecond: start,
                endSecond: end,
                duration,
            };
        });

        return {
            segments,
            metadata: {
                title,
            },
        };
    }
}

export const youtubeTacIqService = new YoutubeTacIqService();
