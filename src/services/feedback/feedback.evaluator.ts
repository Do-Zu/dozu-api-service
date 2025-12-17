export interface FeedbackInput {
    message: string;
    userId?: number;
    userEmail?: string;
    userName?: string;
    imageUrl?: string;
}

export interface FeedbackEvaluationResult {
    score: number;
    shouldSendEmail: boolean;
    reasons: string[];
}

export function evaluateFeedback(feedback: FeedbackInput): FeedbackEvaluationResult {
    const reasons: string[] = [];
    let score = 0;

    const message = feedback.message?.trim() || '';
    const length = message.length;
    const hasImage = Boolean(feedback.imageUrl);

    // Hard spam (short/meaningless)
    const spamKeywords = ['ok', 'test', '.', ':))', ':(', 'haha', 'hi'];
    if (spamKeywords.includes(message.toLowerCase())) {
        return {
            score: 0,
            shouldSendEmail: false,
            reasons: ['spam_keyword'],
        };
    }

    // Content length
    if (length >= 10) {
        score += 1;
        reasons.push('min_length');
    }

    if (length >= 30) {
        score += 2;
        reasons.push('long_message');
    }

    if (message.includes('\n')) {
        score += 1;
        reasons.push('multiline');
    }

    // Important keywords
    if (/lỗi|bug|error|không hoạt động|đề xuất|suggest/i.test(message)) {
        score += 2;
        reasons.push('important_keyword');
    }

    // Image
    if (hasImage) {
        score += 3;
        reasons.push('has_image');
    }

    // Authenticated user
    if (feedback.userId) {
        score += 1;
        reasons.push('authenticated_user');
    }

    return {
        score,
        shouldSendEmail: score >= 3,
        reasons,
    };
}
