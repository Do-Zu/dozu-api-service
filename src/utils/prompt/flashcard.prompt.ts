import { IGenerateOptions } from '@/dtos/generate/models/GenerateContentRequestInterface';
import { safeDestructure } from '../common';

const defaultOptions = {
    numberOfItem: 20,
    difficulty: 'Medium',
    focus: 'essential concepts and key points',
    listType: ['question', 'true/false', 'open-ended', ' multiple-choice', 'fill-in-the-blank'],
};

export const createFlashcardPrompt = (
    content: string,
    options?: IGenerateOptions,
    defaultOptionsParam = defaultOptions
): string => {
    const { numberOfItem, difficulty, focus, listType } = safeDestructure(options, {
        ...defaultOptionsParam,
    });

    const listTypeStr = listType?.join(', ');

    return `Create flashcards from the following content.
  - Focus on ${focus}
  - Difficulty level: ${difficulty}
  - Aim for the smallest effective set, approximately ${numberOfItem} flashcards
  - Responses follow this format: [{"q": "your term/question", "a": "your definition/answer", "type": "One of ${listTypeStr} "}}]
  - Response follow language of the content
  - Create a variety format for flashcard: ${listTypeStr} styles
  - Output should be in only one array
  
  Content: ${content}`;
};
