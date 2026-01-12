import axios from 'axios';
import { safeDestructure, toNumber } from '@/utils/common';
import { IYoutubeServiceOutput } from '@/types/youtube/youtube.type';

class YoutubeTacIqService {
    private readonly API_BASE = 'https://tactiq-apps-prod.tactiq.io/transcript';
    private readonly X_FIREBASE_CHECK_SIGN = process.env.TACTIQ_FIREBASE_APP_CHECK_TOKEN;
    private readonly TIME_OUT = 30000;
    private readonly HEADER_CONFIG = {
        'Content-Type': 'application/json',
        'x-firebase-appcheck': this.X_FIREBASE_CHECK_SIGN
    };

    public async getTranscriptSegment({ url, lang }: { url: string; lang?: string }): Promise<IYoutubeServiceOutput> {
        const { data } = await axios.post<{
            title: string;
            captions: { dur: string; start: string; text: string }[];
        }>(
            this.API_BASE,
            {
                videoUrl: url,
                lang,
            },
            {
                timeout: this.TIME_OUT,
                headers: this.HEADER_CONFIG,
            }
        );

        const { captions, title } = safeDestructure(data, {
            captions: [],
        });

        const segments = captions?.map(item => {
            const start = toNumber(item?.start, 0);
            const duration = toNumber(item?.dur, 0);
            const end = start + duration;

            return {
                text: item?.text,
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
