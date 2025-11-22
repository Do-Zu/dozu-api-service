import { IGenerateOptions } from '@/dtos/generate/models/GenerateContentRequestInterface';
import { safeDestructure } from '../common';

const defaultOptions = {
    numberOfItem: 20,
    difficulty: 'Medium',
    focus: 'essential concepts and key points',
    listType: ['MULTIPLE CHOICE', ' FILL BLANK ', 'TRUE FALSE'],
};

export const createQuizPrompt = (
    content: string,
    options?: IGenerateOptions,
    defaultOptionsParam = defaultOptions
): string => {
    const { numberOfItem, difficulty, focus, listType } = safeDestructure(options, {
        ...defaultOptionsParam,
    });

    const listTypeStr = listType?.join(', ');

    return `Create a quizzes from the following content.
- Focus on ${focus}
- Difficulty level: ${difficulty}
- Aim for the smallest effective set, approximately ${numberOfItem} questions
- Combine various question type includes: ${listTypeStr} format.
- Each question must have exactly 4 options (A, B, C, D)
- Create a variety of question types: OPEN-ENDED QUESTIONS, CLOSED-ENDED QUESTIONS, INVESTIGATION QUESTIONS, DIRECTIONAL QUESTIONS, REVERSE QUESTIONS
- Randomize the position of the correct answer within the options
  Note: q: is question, o: options, idx: index of the correct answer (0-3). For example:
[{"q": "Your question here", "o": ["A", "B", "C", "D"], "idx": 1}]
- Response follow language of the content
- Output should be in only one array

Content: ${content}`;
};
