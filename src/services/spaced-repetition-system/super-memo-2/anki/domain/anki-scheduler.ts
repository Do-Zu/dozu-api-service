import { IAnkiCard, IAnkiRating, IAnkiResult } from "../../anki.service";

/* 
    Anki scheduler Interface
*/
export default interface AnkiScheduler {
    /**
     *
     * @param card an AnkiCard instance
     * @param rating a rating that user clicks to rate the anki card's difficulty
     */
    schedule(card: IAnkiCard, rating: IAnkiRating): IAnkiResult;
}
