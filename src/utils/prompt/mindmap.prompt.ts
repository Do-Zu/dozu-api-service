import { IMindmapGenerateOptions } from '@/dtos/generate/models/GenerateContentRequestInterface';

const DEFAULT_COLOR_THEME = {
    name: 'Default',
    colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#6b7280'],
};

/**
 * Create a specialized prompt for mindmap generation
 */
function createMindmapPrompt(content: string, fileName: string): string {
    return buildMindmapPromptTemplate(content, fileName, {
        maxCategories: '10',
        maxSubtopics: '6',
        maxLabelWords: '10',
        contentTruncateLength: 8000,
    });
}

/**
 * Create a custom mindmap prompt with specific configuration
 * @param content The content to analyze
 * @param fileName The name of the file being processed
 * @param promptConfig Custom configuration for the prompt
 * @returns Formatted prompt string
 */
function createCustomMindmapPrompt(
    content: string,
    fileName?: string,
    promptConfig: {
        maxCategories?: string;
        maxSubtopics?: string;
        maxLabelWords?: string;
        contentTruncateLength?: number;
        pageInfo?: { start: number; end: number; total: number };
        isLargeDocument?: boolean;
        customInstructions?: string;
    } & IMindmapGenerateOptions = {}
): string {
    return buildMindmapPromptTemplate(content, fileName, promptConfig);
}

/**
 * Create a simplified mindmap prompt for basic documents
 * @param content The content to analyze
 * @param fileName The name of the file being processed
 * @returns Formatted prompt string for simple mindmap generation
 */
function createSimpleMindmapPrompt(content: string, fileName: string): string {
    return buildMindmapPromptTemplate(content, fileName, {
        maxCategories: '3-5',
        maxSubtopics: '2-3',
        maxLabelWords: '2-3',
        contentTruncateLength: 5000,
        isLargeDocument: false,
    });
}

/**
 * Create a detailed mindmap prompt for complex documents
 * @param content The content to analyze
 * @param fileName The name of the file being processed
 * @param pageInfo Optional page information
 * @returns Formatted prompt string for detailed mindmap generation
 */
function createDetailedMindmapPrompt(
    content: string,
    fileName: string,
    pageInfo?: { start: number; end: number; total: number }
): string {
    return buildMindmapPromptTemplate(content, fileName, {
        maxCategories: '7-10',
        maxSubtopics: '4-6',
        maxLabelWords: '4-8',
        contentTruncateLength: 15000,
        pageInfo,
        isLargeDocument: true,
        customInstructions:
            'Focus on creating comprehensive coverage with detailed relationships between concepts. Include technical terminology where appropriate.',
    });
}

/**
 * Enhanced mindmap prompt for large files with page information
 */
function createLargeFileMindmapPrompt(
    content: string,
    fileName: string,
    pageInfo?: { start: number; end: number; total: number }
): string {
    return buildMindmapPromptTemplate(content, fileName, {
        maxCategories: '5-8',
        maxSubtopics: '3-5',
        maxLabelWords: '3-6',
        contentTruncateLength: 12000,
        pageInfo,
        isLargeDocument: true,
    });
}

/**
 * Build a reusable mindmap prompt template
 * @param content The content to analyze
 * @param fileName The name of the file being processed
 * @param options Configuration options for the prompt
 * @returns Formatted prompt string
 */
function buildMindmapPromptTemplate(
    content: string,
    fileName?: string,
    options: {
        maxCategories?: string;
        maxSubtopics?: string;
        maxLabelWords?: string;
        contentTruncateLength?: number;
        pageInfo?: { start: number; end: number; total: number };
        isLargeDocument?: boolean;
        customInstructions?: string;
    } & IMindmapGenerateOptions = {}
): string {
    const type = options.type ?? 'abstract';
    const instruction = options.instruction ?? '';
    const colorTheme = options.colorTheme ?? DEFAULT_COLOR_THEME;

    return `
An abstract mindmap is a high-level conceptual representation of the content.
Characteristics:
- Focus on core ideas, key themes, and major relationships only.
- Use 2-3 depth levels.
    + Levels 2 nodes typically represent main categories or primary ideas of the topic.
    + A third depth level is optional but should be included whenever the content contains meaningful sub-ideas or sub-points that contribute to structural clarity, while still avoiding detailed explanations.
- Node description must be an empty string.
- Prioritize clarity, structure, and overall overview.

A detailed mindmap is a clear and well-structured expansion of the content that reflects its actual level of detail.
Characteristics:
- Cover main ideas and all meaningful supporting points present in the content.
- Use a slightly deeper structure than an abstract mindmap (usually 3-5 levels).
    + The first two levels may be the same as those in the abstract mindmap.
    + Additional depth levels should be added only when the input content explicitly contains deeper structure or sub-points.
    + Do not invent, infer, or assume extra layers that are not present in the content.
- Depth rule:
    + If the content includes deeper sub-points (e.g. definitions, explanations, subtopics), represent them as deeper nodes.
    + If the content stops at a higher level, do not force additional layers.
- Node descriptions may include brief explanations or important sub-points, without going into excessive detail.
- Focus on clarity, logical flow, and practical understanding.

You are an expert at creating ${type} mind map from. Analyze the following content and create a ${type} mindmap.

IMPORTANT: Return your response as valid JSON that matches this exact structure:
{
  "nodes": [
    {
      "id": "unique_id",
      "position": {"x": number, "y": number},
      "data": {
        "label": "Main Topic or Subtopic",
        "description":"Summary of the content related to this node or empty string if is abstract mindmap type",
        "isRoot": true,
        "color":"#ef4444 or empty string if isRoot is true",
        "roadmapOrder":0
      }
    }
  ],
  "edges": [
    {
      "id": "unique_edge_id",
      "source": "source_node_id",
      "target": "target_node_id",
      "data":{
        "color":"#ef4444"
      }
    }
  ]
}

IMPORTANT: 
- If the type of mindmap is abstract, ALL NODES' description must be an empty string. (i.e. "description": "")
- Node color must be an empty string if it is the root node. (i.e. "color": "")

Guidelines:
- Create a central main topic node, only this main topic node will have the isRoot property inside data as true, all other nodes will have isRoot:false 
- Neither nodes nor edges should ever be empty, ALWAYS INCLUDE BOTH NODES AND EDGES IN RESPONSE
- Ensure all node IDs are unique
- Ensure comprehensive coverage of the provided content, 
- Connect nodes with edges, do not create loop and all nodes must be connected
- Response must follow the language of the content
- Each node must have a comprehensive summary of the related content including the overall themes and the major ideas covered, stored in the description property of data.
- Color may be assigned to each node as one of the following strings ${colorTheme.colors} to the property color inside node data, the provided structure has included a color as an example but root node shouldn't have color, the branches from it can have a unifying color to distinguish themselves.
    - Color should be selected to ensure sufficient contrast between sibling branches, making each branch visually distinct and easy to differentiate.
    - Root node must not be colored. 
- Color may be assigned to each edge, in this case, if the target node is colored, the edge should be the same color, the color is specified as property color inside edge data, , the provided structure has included a color as an example 
- If there are only a few branches, use distinct colors (for example, avoid using '${colorTheme.colors[0] ?? DEFAULT_COLOR_THEME.colors[0]}, ${colorTheme.colors[1] ?? DEFAULT_COLOR_THEME.colors[1]}' for branches close to each other as they are red and orange, making them blend in with each other). Disregard if there are too many branches.
- Consider using only one color for each branch if there are enough colors.
- Each child node of a node may include one distinct roadmapOrder with respect to the parent node (meaning for all child nodes of a node, they may be numbered from 0, 1, 2,... and child nodes of another parent node may also be numbered from 0, 1, 2,...) to help visualize learning path, going from 0 to amount of child node of root node minus 1. It's supposed to represent a roadmap so try to keep the node in roughly the chronological order of the original content. Root node should not be included in the roadmap, roadmapOrder here is only shown as a reference.
- Instead of having too many branches originating from root node, combine related branches into one. Essentially, add an extra node in the between the root node and these nodes to group the idea, this node should represent the general idea of its child nodes.

Content to analyze:
${content}

${instruction ? `Additional Instructions: ${instruction}\n\n` : ''}

Return only the JSON structure, no additional text or formatting.
`;
}

export {
    createMindmapPrompt,
    createCustomMindmapPrompt,
    createSimpleMindmapPrompt,
    createDetailedMindmapPrompt,
    createLargeFileMindmapPrompt,
};
