import { TYPE_PROMPT } from '@/utils/prompt';

export const LIST_TYPES_DESCRIPTION = `
- MULTIPLE CHOICE: A question with 4 options where only one option is correct. Tests recognition, recall, or application of knowledge.
- TRUE FALSE: A statement that the learner must judge as true or false. Use additional distractors like "Not Given" or "Unknown" to fill 4 options.
- FILL BLANK: A sentence or phrase with a missing word or phrase. One correct answer and 3 plausible distractors.
- FREE RESPONSE: An open-ended question requiring a written answer in the learner's own words. Still provide 4 suggested options as examples if needed.
`;

export const TYPE_PROMPT_MAPPING: Record<string, TYPE_PROMPT> = {
    flashcard: 'FLASH_CARD',
    quiz: 'QUIZ',
    mindmap: 'MIND_MAP',
    feynman_review: 'FEYNMAN_REVIEW',
    feynman_question: 'FEYNMAN_QUESTION',
    short_summary: 'SHORT_SUMMARY',
    multi_node_flashcard: 'MULTI_NODE_FLASHCARD',
};
