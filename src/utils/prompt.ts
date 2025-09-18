import { createFeynmanPrompt } from './prompt/feynman.prompt';
import { createCustomMindmapPrompt } from './prompt/mindmap.prompt';

const PROMPT_TEMPLATE_FLASHCARD = `Create flashcards from the following content.
  - Focus on essential concepts and key points only
  - Aim for the smallest effective set, not exceeding 40 flashcards
  - Responses follow this format: [{"q": "your term/question", "a": "your definition/answer"}]
  - Response follow language of the content
  - Create a variety format for flashcard: question,true/false,open-ended,multiple-choice,fill-in-the-blank styles
  - Output should be in only one array
`;

const PROMPT_TEMPLATE_QUIZ_MULTIPLE_CHOICE = `Create a quizzes from the following content.
- Focus on essential concepts and key points only
- Aim for the smallest effective set , not exceeding to 30 questions
- Combine various question type includes:  MULTIPLE CHOICE , FILL BLANK , TRUE FALSE format.
- Each question must have exactly 4 options (A, B, C, D)
- Create a variety of question types: OPEN-ENDED QUESTIONS, CLOSED-ENDED QUESTIONS, INVESTIGATION QUESTIONS, DIRECTIONAL QUESTIONS, REVERSE QUESTIONS
- Randomize the position of the correct answer within the options
  Note: q: is question, o: options, idx: index of the correct answer (0-3). For example:
[{"q": "Your question here", "o": ["A", "B", "C", "D"], "idx": 1}]
- Response follow language of the content
- Output should be in only one array
`;

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
    | 'FEYNMAN';

const generatePromptText = (content: string, type: TYPE_PROMPT): string => {
    switch (type) {
        case 'FLASH_CARD':
            return `${PROMPT_TEMPLATE_FLASHCARD} 
                Content: ${content}`;
        case 'MULTIPLE_CHOICE':
        case 'TRUE_FALSE':
        case 'FILL_BANK':
        case 'QUIZ':
            return `${PROMPT_TEMPLATE_QUIZ_MULTIPLE_CHOICE} 
                Content: ${content}`;
        case 'MIND_MAP':
            return createCustomMindmapPrompt(content);
        case 'FEYNMAN':
            return createFeynmanPrompt(content);
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
