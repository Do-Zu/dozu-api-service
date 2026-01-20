import { ICommonGenerateOptions } from '@/dtos/generate/models/GenerateContentRequestInterface';
import { safeDestructure } from '../common';
import { LIST_TYPES_DESCRIPTION } from './constant/prompt.constant';

const defaultOptions = {
    numberOfItem: 20,
    difficulty: 'Medium',
    focus: 'essential concepts and key points',
    listType: ['MULTIPLE CHOICE'],
};

export const createQuizPrompt = (
    content: string,
    options?: ICommonGenerateOptions,
    defaultOptionsParam = defaultOptions
): string => {
    const { numberOfItem, difficulty, focus, listType } = safeDestructure(options, {
        ...defaultOptionsParam,
    });

    // Clean up list types to ensure strings are trimmed
    const validListTypes = listType?.map(t => t.trim()).join(', ') || 'MULTIPLE CHOICE';
    const typeCount = listType?.length || 1;
    const numberOfItemsPerType = Math.floor(numberOfItem / typeCount);
    const remaining = numberOfItemsPerType + (numberOfItem % typeCount);
    const firstType = listType && listType.length > 0 ? listType[0] : 'MULTIPLE CHOICE';

    return `
# ROLE
You are an expert educational content creator and a strict JSON parser.

# TASK
Generate a quiz array based on the provided CONTENT text. 

# LIST TYPE DESCRIPTIONS
${LIST_TYPES_DESCRIPTION}

# CONSTRAINTS
1. **Quantity:** Generate exactly ${numberOfItem} questions.
2. **Difficulty:** ${difficulty}.
3. **Focus:** Focus strictly on ${focus}.
4. **Language:** The output language MUST match the language of the CONTENT text.
5. **Format:** Return ONLY a valid JSON array. Do not include markdown code blocks (like \`\`\`json), comments, or introductory text.
6. **Question Types:** Use these formats: ${validListTypes}.
7. **Options:** Every question must have exactly 4 options ("o" array). 
8. **Distribution:** Distribute the questions evenly across all specified question types.
    - Generate exactly ${numberOfItemsPerType} questions for each question type listed in listType.
    - The first question type (${firstType}) should generate ${remaining} questions in total, which includes ${numberOfItem % listType.length} additional question(s) from the remainder.
    - Do not generate more or fewer questions than specified for any type.

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

# IMPORTANT RULE FOR FREE RESPONSE:
- If the correct answer would be "All of the above", the correct answer in the "o" array MUST instead be an explicit, complete sentence that combines the meaning of the relevant options.
- EXAMPLE
    - Invalid FREE RESPONSE options:
        + "Client sends request"
        + "Server processes data"
        + "Server returns response"
        + "All of the above"
    - Replace "All of the above" with:
        + "Client sends a request to the server, the server processes the data, and then returns a response to the client."

# CONTENT
"""
${content}
"""

# RESPONSE
Should be in only one array
`;
};
