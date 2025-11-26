import { IGenerateOptions } from '@/dtos/generate/models/GenerateContentRequestInterface';
import { safeDestructure } from '../common';

const defaultOptions = {
    numberOfItem: 20,
    difficulty: 'Medium',
    focus: 'essential concepts and key points',
    listType: ['QUESTION', 'TRUE FALSE', 'OPEN ENDED', 'MULTIPLE CHOICE', 'FILL BLANK'],
};

export const createFlashcardPrompt = (
    content: string,
    options?: IGenerateOptions,
    defaultOptionsParam = defaultOptions
): string => {
    const { numberOfItem, difficulty, focus, listType } = safeDestructure(options, {
        ...defaultOptionsParam,
    });

    const validListTypes = listType?.map(t => t.trim()).join(', ');

    return `
# ROLE
You are an expert in Learning Science and Spaced Repetition Systems.

# TASK
Create a set of ${numberOfItem} flashcards based on the provided CONTENT.

# CONSTRAINTS
1. **Quantity:** Generate exactly ${numberOfItem} flashcards.
2. **Difficulty:** ${difficulty}.
3. **Focus:** Focus strictly on ${focus}.
4. **Language:** The output language MUST match the language of the CONTENT text.
5. **Format:** Return ONLY a valid JSON array. No markdown, no intro text.
6. **Brevity:** The "a" (Answer) side must be concise (under 50 words). Avoid long paragraphs. 
7. **Atomic Principle:** Each card should test only ONE specific concept.

# FLASHCARD TYPES formatting
You must format the "q" (Front) and "a" (Back) according to the selected types: ${validListTypes}

# OUTPUT SCHEMA
The output must strictly follow this define:
{
  q: string; // The front of the card (Prompt)
  a: string; // The back of the card (Solution)
  type: string; // One of: ${validListTypes}
}

# CONTENT
"""
${content}
"""

# RESPONSE
 Should be in only one array
`;
};
