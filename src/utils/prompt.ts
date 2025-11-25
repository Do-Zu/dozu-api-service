import { createCustomMindmapPrompt } from './prompt/mindmap.prompt';
import { createFeynmanEvaluationPrompt, createFeynmanPromptGenerateQuestion } from './prompt/feynman.prompt';
import { createFlashcardPrompt } from './prompt/flashcard.prompt';
import { createQuizPrompt } from './prompt/quiz.prompt';
import { IGenerateOptions } from '@/dtos/generate/models/GenerateContentRequestInterface';
export const DEFAULT_MAX_ITEM_GEN = 40;
const PROMPT_SUMMARY_CONTENT = `Create a summary of the following content.
- Focus on essential concepts and key points only
- Aim for the smallest effective set, not exceeding 5 sentences
- Response follow language of the content
- Output should be in only one string
`;

export type TYPE_PROMPT =
    | 'FLASH_CARD'
    | 'MULTIPLE_CHOICE'
    | 'TRUE_FALSE'
    | 'FILL_BANK'
    | 'MIND_MAP'
    | 'QUIZ'
    | 'FEYNMAN_QUESTION'
    | 'FEYNMAN_REVIEW';

const generatePromptText = (content: string, type: TYPE_PROMPT, options?: IGenerateOptions): string => {
    switch (type) {
        case 'FLASH_CARD':
            return createFlashcardPrompt(content, options);
        case 'QUIZ':
            return createQuizPrompt(content, options);
        case 'MIND_MAP':
            return createCustomMindmapPrompt(content);
        case 'FEYNMAN_QUESTION':
            return createFeynmanPromptGenerateQuestion(content);
        case 'FEYNMAN_REVIEW':
            return createFeynmanEvaluationPrompt(content);
        default:
            return `${PROMPT_SUMMARY_CONTENT} 
                Content: ${content}`;
    }
};

/**
 * Converts a JSON string (like those from API responses) into a proper JavaScript array
 *
 * @param jsonString - The JSON string to parse
 * @returns An array of quiz questions/flashcards
 */
function convertJsonToArray(jsonString: string): any[] {
    // Remove code block markers if present
    const cleanedString = jsonString
        .replace(/^```json\n/, '')
        .replace(/\n```$/, '')
        .trim();

    try {
        // Try to parse the cleaned string
        return JSON.parse(cleanedString);
    } catch (error) {
        console.error('Error parsing JSON string:', error);

        // If direct parsing fails, try to extract array portion
        try {
            const arrayMatch = cleanedString.match(/\[\s*{[\s\S]*}\s*\]/);
            if (arrayMatch && arrayMatch[0]) {
                return JSON.parse(arrayMatch[0]);
            }
        } catch (innerError) {
            console.error('Failed to extract array from string:', innerError);
        }

        // Return empty array if all parsing attempts fail
        return [];
    }
}

export { generatePromptText, convertJsonToArray };
