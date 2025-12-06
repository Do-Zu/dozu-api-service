import { ICommonGenerateOptions, IGenerateOptions } from '@/dtos/generate/models/GenerateContentRequestInterface';
import { safeDestructure } from '../common';
import { LIST_TYPES_DESCRIPTION } from './constant/prompt.constant';

const defaultOptions = {
    numberOfItem: 20,
    difficulty: 'Medium',
    focus: 'essential concepts and key points',
    listType: ['QUESTION', 'TRUE FALSE', 'OPEN ENDED', 'MULTIPLE CHOICE', 'FILL BLANK'],
};

export const createFlashcardPrompt = (
    content: string,
    options?: ICommonGenerateOptions,
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

# LIST TYPE DESCRIPTIONS
${LIST_TYPES_DESCRIPTION}

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

export function createFlashcardForMultiNodesPrompt(content: string, options?: IGenerateOptions): string {
    const { commonGenerateOptions, nodesData } = safeDestructure(options);
    const { numberOfItem, difficulty, focus, listType } = safeDestructure(commonGenerateOptions, {
        ...defaultOptions,
    });

    const validListTypes = listType?.map(t => t.trim()).join(', ');
    return `
        Create a set of flashcards for multiple nodes of a mindmap as described below.

        Each node has:
        - a nodeId
        - a label (the node's title)
        - a description (a brief summary of the node)
        - a start and end section that define which part of the full content belongs to that node

        The "full content" is the original content of the topic.  
        The start and end sections indicate the boundaries of the node's content relative to the full content.

        Your task:
        - Create flashcards **separately for each node**, strictly based on the portion of the full content that lies between the node's start and end sections.
        - Do NOT mix information between nodes.
        - Do NOT include content outside the start-end range of each node.
        - Distribute flashcards across nodes based on the **richness and depth** of each node's content, ensuring that nodes with more substantial information receive more flashcards.

        Constraints:
            1. **Quantity:** The **total number** of flashcards across all nodes must be exactly **${numberOfItem}**.
            2. **Difficulty:** ${difficulty}.
            3. **Focus:** Focus strictly on ${focus}.
            4. **Type Constraint:** 
                - Each flashcard must belong to **one of the following valid list types**: ${validListTypes}.

        List types description:
        ${LIST_TYPES_DESCRIPTION}

        Output format (strict):
        - The result must be **one single array**.
        - Each element of the array is an object:  
          { nodeId: string, flashcards: [{ q: string, a: string }] }
        - The "flashcards" array for each node must appear exactly once.
        - Each flashcard is an object:  
          { q: "question or term", a: "answer or definition", type: "One of ${validListTypes}" }

        Below is the list of nodes with their metadata:

        ${(nodesData ?? [])
            .map((node, index) => {
                return `- Node ${index}:
                    - NodeId: ${node.nodeId}
                    - Label: ${node.label}
                    - Description: ${node.description}
                    - Start section: ${node.startSection} ...
                    - End section: ... ${node.endSection}\n
            `;
            })
            .join('')}

        The following is the full original content:
        - Content: ${content}
    `;
}
