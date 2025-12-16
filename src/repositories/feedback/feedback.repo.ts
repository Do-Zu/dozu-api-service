import db from '@/libs/drizzleClient.lib';
import { feedbackTable, type TypeInsertFeedback } from '@/models/feedback/feedback.model';

export type CreateFeedbackInput = Pick<
    TypeInsertFeedback,
    | 'message'
    | 'userId'
    | 'userEmail'
    | 'userName'
    | 'imageUrl'
    | 'score'
    | 'shouldSendEmail'
    | 'reasons'
>;

class FeedbackRepository {
    public async create(input: CreateFeedbackInput): Promise<{ feedbackId: number }> {
        const [inserted] = await db
            .insert(feedbackTable)
            .values(input)
            .returning({ feedbackId: feedbackTable.feedbackId });

        return { feedbackId: inserted.feedbackId };
    }
}

export const feedbackRepository = new FeedbackRepository();
export default feedbackRepository;
