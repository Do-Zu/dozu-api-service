import { DecodedTokenPayload } from '@/types/auth/jwtPayload.type';
import { IClass } from '@/types/class-based-learning/class.type';
import { ITopic } from '@/types/topic/topic.type';

declare global {
    namespace Express {
        interface Request {
            currentUser?: DecodedTokenPayload;
            validated?: {
                params?: {
                    classId?: number;
                    topicId?: number;
                    flashcardId?: number;
                    requestId?: number;
                    feedId?: number;
                };
                body?: any;
                query?: any;
            };
            resources?: {
                topic?: ITopic;
                class?: IClass;
            };
        }
    }
}

export {};
