import { IAnkiSetting } from '@/types/anki-setting/ankiSetting.type';
import AnkiSchedulerInterface from '../domain/anki-scheduler';
import { IAnkiCard, IAnkiResult, IAnkiRating, IAnkiStatus } from '../../anki.service';
import LearningStageHandler from './learning.handler';
import ReviewStageHandler from './review.handler';
import RelearningStageHandler from './relearning.handler';
import { getSystemDate } from '@/utils/date';
import { INVALID_STATUS_MESSAGE } from '../constants/anki.constant';

export type IPrivateAnkiCard = Omit<IAnkiCard, 'lastReviewed'> & {
    lastReviewed: Date;
};

/**
 * Main implementation for anki scheduling logic
 */
class AnkiScheduler implements AnkiSchedulerInterface {
    private learningStageHandler;
    private reviewStageHandler;
    private relearningStageHandler;

    /**
     *
     * @param ankiSetting an ankiSetting instance, allowing user to customize params in anki algorithm
     */
    constructor(readonly ankiSetting: IAnkiSetting) {
        this.learningStageHandler = new LearningStageHandler(ankiSetting);
        this.reviewStageHandler = new ReviewStageHandler(ankiSetting);
        this.relearningStageHandler = new RelearningStageHandler(ankiSetting);
    }

    /**
     * Implementation for scheduling logic
     * @param card an AnkiCard instance
     * @param rating a rating that user clicks to rate the anki card's difficulty
     */
    schedule(card: IAnkiCard, rating: IAnkiRating): IAnkiResult {
        // copy card object, update lastReviewed
        card = { ...card, lastReviewed: getSystemDate() };

        if (card.status === IAnkiStatus.NEW) {
            card.status = IAnkiStatus.LEARNING;
        }

        switch (card.status) {
            case IAnkiStatus.LEARNING:
                return this.learningStageHandler.handleLearning(card as IPrivateAnkiCard, rating);
            case IAnkiStatus.REVIEW:
                return this.reviewStageHandler.handleReview(card as IPrivateAnkiCard, rating);
            case IAnkiStatus.RELEARNING:
                return this.relearningStageHandler.handleRelearning(card as IPrivateAnkiCard, rating);
            default:
                throw new Error(INVALID_STATUS_MESSAGE);
        }
    }
}

export default AnkiScheduler;
