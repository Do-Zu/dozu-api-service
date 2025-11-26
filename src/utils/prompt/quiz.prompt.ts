import { IGenerateOptions } from '@/dtos/generate/models/GenerateContentRequestInterface';
import { safeDestructure } from '../common';

const defaultOptions = {
    numberOfItem: 20,
    difficulty: 'Medium',
    focus: 'essential concepts and key points',
    listType: ['MULTIPLE CHOICE', 'FILL BLANK', 'TRUE FALSE'],
};

export const createQuizPrompt = (
    content: string,
    options?: IGenerateOptions,
    defaultOptionsParam = defaultOptions
): string => {
    const { numberOfItem, difficulty, focus, listType } = safeDestructure(options, {
        ...defaultOptionsParam,
    });

    // Clean up list types to ensure strings are trimmed
    const validListTypes = listType?.map(t => t.trim()).join(', ') || 'MULTIPLE CHOICE';

    return `
# ROLE
You are an expert educational content creator and a strict JSON parser.

# TASK
Generate a quiz array based on the provided CONTENT text. 

# CONSTRAINTS
1. **Quantity:** Generate exactly ${numberOfItem} questions.
2. **Difficulty:** ${difficulty}.
3. **Focus:** Focus strictly on ${focus}.
4. **Language:** The output language MUST match the language of the CONTENT text.
5. **Format:** Return ONLY a valid JSON array. Do not include markdown code blocks (like \`\`\`json), comments, or introductory text.
6. **Question Types:** Use these formats: ${validListTypes}.
7. **Options:** Every question must have exactly 4 options ("o" array). 
   - For TRUE/FALSE: Use ["True", "False", "Not Given", "Unknown"] or similar distractors to fill 4 spots, but point to the correct boolean logic.
   - For FILL BLANK: Provide the correct word as one option and 3 plausible distractors.

# COGNITIVE TYPES
While following the formats above, vary the cognitive style of questions:
- RECALL (Definitions)
- APPLICATION (Scenarios)
- ANALYSIS (Why/How)
- REVERSE (Which is NOT...)

# OUTPUT SCHEMA
The output must strictly follow this JSON OBJECT:
{
  q: string; // The question stem
  o: [string, string, string, string]; // Exactly 4 options
  idx: number; // 0-3 (Index of the correct answer)
  type: string; // One of: ${validListTypes}
  hint: string; // A helpful hint
  explain: string; // Detailed explanation of why the answer is correct
}

# CONTENT
"""
${content}
"""

# RESPONSE
Should be in only one array
`;
};
