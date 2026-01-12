import axios from 'axios';
import { safeDestructure, toNumber } from '@/utils/common';
import { IYoutubeServiceOutput } from '@/types/youtube/youtube.type';

class YoutubeTacIqService {
    private readonly API_BASE = 'https://tactiq-apps-prod.tactiq.io/transcript';
    private readonly X_FIREBASE_CHECK_SIGN = 'eyJraWQiOiJ2ckU4dWciLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxOjg3MTIyMzI5NjI0Mjp3ZWI6MGIzNzAzOWIyMGRkNzA5MzAyZDA2YiIsImF1ZCI6WyJwcm9qZWN0cy84NzEyMjMyOTYyNDIiLCJwcm9qZWN0cy90YWN0aXEtYXBwcy1wcm9kIl0sInByb3ZpZGVyIjoicmVjYXB0Y2hhX3YzIiwiaXNzIjoiaHR0cHM6Ly9maXJlYmFzZWFwcGNoZWNrLmdvb2dsZWFwaXMuY29tLzg3MTIyMzI5NjI0MiIsImV4cCI6MTc2ODIzMzYzNCwiaWF0IjoxNzY4MjMwMDM0LCJqdGkiOiJGV01jU0tOSVFYNEUtNGk3X3ZvMFU0aldyejF4b19LX1VnaTJRa1NxdmZrIn0.LnRhcOwL6xUqT0-a_ZwDLeQSntypxuy9iLV2FEf9jO0S2WoXC8GJm0vhdv-BUnCdYPhI6ZF9kTyEHUK082arwYAI46GJqJChEAsEgBwSNZ_RdqksKXNK-NL63bHSUg0I0BipL18F6ezAk0s-WazjbkUTyNAPMGRp0suiOyMqpN1XINZuQBZ7AKJLytoCTCp_-WREGEgpi9uik-4rXIYw_bClsqgH_gRjXqeIdbtCHdnZsUrqBsgsvP4d2KQDZZKPldjaSWApeXbRmi5GGBTZVKucHze1t1NQEL5VSj3MmecqKvORwSFUlK0SRNwAeC2QsI8l3W0iPrxp34yZ8k3v39M9UgvzontaCfX4U7H0Qne3puCiI5N-rFErCsUv5JhKaQbaCBYqSxyLpaMSFrCCkZpkCNxkHIBEz6fW7D6PTCPdkZg6OabALFKHtN7_F_98FmDj6p4uu8cBAZU9JHaHMlk4CxheGTa1Y_lPIcyMIdoMXcVKez-hp5o_1OT0xSjP';
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
