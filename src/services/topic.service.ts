import topicRepo from "@/repositories/topic.repo"
import db from '@/libs/drizzleClient.lib';
import { eq } from "drizzle-orm";
import { flashcardsTable } from "@/models";

const handleIsExistedTopic = async(topicId: any) => {
    const topic = await topicRepo.handleIsExistedTopic(topicId);
    return topic ? true : false;
}

const handleIsFlashcardBelongedToTopic = async(flashcardId: any, topicId: any) => {
    const flashcard = await db
        .query
        .flashcardsTable
        .findFirst({
            where: eq(flashcardsTable.flashcardId, flashcardId)
        })

    if(!flashcard) return false;
    return flashcard.topicId === topicId;
}

const topicService = { handleIsExistedTopic, handleIsFlashcardBelongedToTopic };

export default topicService;