import { DecodedTokenPayload } from '@/types/auth/jwtPayload.type';
import { IClass } from '@/types/class-based-learning/class.type';
import { ITopic } from '@/types/topic/topic.type';
import { IClassInvite } from '@/types/class-based-learning/classInvite.type';
import { IClassQuizResource } from '@/types/class-based-learning/quizClass.type';

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
                    settingId?: number;
                    assignmentId?: number;
                    classQuizId?: number;
                    submissionId?: number;
                };
                body?: any;
                query?: any;
            };
            resources?: {
                topic?: ITopic;
                class?: IClass;
                classQuiz?: IClassQuizResource;
            };
            invite?: IClassInvite;
        }
    }
}

export {};
