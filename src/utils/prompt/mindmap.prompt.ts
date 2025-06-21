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
    } = {}
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
    } = {}
): string {
    const {
        maxCategories = '3-7',
        maxSubtopics = '2-4',
        maxLabelWords = '3-4',
        contentTruncateLength = 8000,
        isLargeDocument = false,
        customInstructions,
    } = options;

    // const pageText = pageInfo ? ` (Pages ${pageInfo.start}-${pageInfo.end} of ${pageInfo.total})` : '';

    const documentType = isLargeDocument ? 'comprehensive educational' : 'educational';
    const categoryCount = isLargeDocument ? '5-8' : maxCategories;
    const subtopicCount = isLargeDocument ? '3-5' : maxSubtopics;
    const labelWords = isLargeDocument ? '3-6' : maxLabelWords;

    const truncatedContent = content.substring(0, contentTruncateLength);
    const contentSuffix =
        content.length > contentTruncateLength
            ? isLargeDocument
                ? '...(content continues - this is a section of a larger document)'
                : '...(content truncated)'
            : '';

    return `
You are an expert at creating ${documentType} mindmaps from ${isLargeDocument ? 'large ' : ''}documents. Analyze the following content  and create a ${isLargeDocument ? 'detailed' : 'comprehensive'} mindmap structure${isLargeDocument ? ' that captures the main themes and relationships' : ''}.

IMPORTANT: Return your response as valid JSON that matches this exact structure:
{
  "nodes": [
    {
      "id": "unique_id",
      "position": {"x": number, "y": number},
      "data": {
        "label": "Main Topic or Subtopic",
        "pageStartIndex": "Page start index belonging to this node",
        "pageEndIndex": "Page end index belonging to this node",
      }
    }
  ],
  "edges": [
    {
      "id": "unique_edge_id",
      "source": "source_node_id",
      "target": "target_node_id"
    }
  ]
}

Guidelines${isLargeDocument ? ' for large document mindmaps' : ''}:
1. Create ${isLargeDocument ? '1 central' : 'a central'} main topic node
2. Add maximum ${categoryCount} main category nodes connected to the central topic
3. Add maximum ${subtopicCount} subtopic nodes for each main category
4. ${isLargeDocument ? 'Use hierarchical positioning (central -> categories -> subtopics)' : 'Position nodes in a hierarchical layout'}
${isLargeDocument ? '5. Include cross-references between related concepts' : '5. Ensure all node IDs are unique'}
${isLargeDocument ? '6. Use clear, descriptive labels (' + labelWords + ' words per node)' : '6. Connect related concepts with edges'}
${isLargeDocument ? '7. Ensure comprehensive coverage of the document section' : '7. Use clear, concise labels (max ' + labelWords + ' words per node)'}
${isLargeDocument ? '8. Position nodes to avoid overlapping' : ''}

Content to analyze${isLargeDocument ? ' (truncated for processing)' : ''}:
${truncatedContent} ${contentSuffix}

${customInstructions ? `Additional Instructions: ${customInstructions}\n\n` : ''}Return only the JSON structure, no additional text or formatting.`;
}

export {
    createMindmapPrompt,
    createCustomMindmapPrompt,
    createSimpleMindmapPrompt,
    createDetailedMindmapPrompt,
    createLargeFileMindmapPrompt,
};
