import { IGenerateOptions } from '@/dtos/generate/models/GenerateContentRequestInterface';
import { safeDestructure } from '../common';

const defaultOptions = {
    numberOfItem: 20,
    difficulty: 'Medium',
    focus: 'essential concepts and key points',
    listType: ['MULTIPLE CHOICE', 'TRUE FALSE', 'FILL BLANK'],
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

# LIST TYPE DESCRIPTIONS
- MULTIPLE CHOICE: A question with 4 options where only one option is correct. Tests recognition, recall, or application of knowledge.
- TRUE FALSE: A statement that the learner must judge as true or false. Use additional distractors like "Not Given" or "Unknown" to fill 4 options.
- FILL BLANK: A sentence or phrase with a missing word or phrase. One correct answer and 3 plausible distractors.
- FREE RESPONSE: An open-ended question requiring a written answer in the learner's own words. Still provide 4 suggested options as examples if needed.

# CONSTRAINTS
1. **Quantity:** Generate exactly ${numberOfItem} questions.
2. **Difficulty:** ${difficulty}.
3. **Focus:** Focus strictly on ${focus}.
4. **Language:** The output language MUST match the language of the CONTENT text.
5. **Format:** Return ONLY a valid JSON array. Do not include markdown code blocks (like \`\`\`json), comments, or introductory text.
6. **Question Types:** Use these formats: ${validListTypes}.
7. **Options:** Every question must have exactly 4 options ("o" array). 
8. **Distribution:** The total number of questions must be distributed as evenly as possible among the specified question types in ${validListTypes}. If the number cannot be divided equally, assign the remaining questions starting from the first type in the list.

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
