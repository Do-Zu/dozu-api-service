import { IAnkiCard, IAnkiResult, IAnkiRating } from '../../anki.service';
import AnkiScheduler from '../domain/anki-scheduler';

/**
 * Public API layer for Anki scheduling logic
 */
class AnkiService {
    /**
     *
     * @param scheduler Concrete implementation of AnkiScheduler
     */
    constructor(private readonly scheduler: AnkiScheduler) {}

    public schedule(card: IAnkiCard, rating: IAnkiRating): IAnkiResult {
        return this.scheduler.schedule(card, rating);
    }
}

export default AnkiService;
