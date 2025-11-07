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
        maxCategories = '30',
        maxSubtopics = '20',
        maxLabelWords = '10',
        //contentTruncateLength = 8000,
        isLargeDocument = false,
        customInstructions,
    } = options;

    // const pageText = pageInfo ? ` (Pages ${pageInfo.start}-${pageInfo.end} of ${pageInfo.total})` : '';

    const documentType = isLargeDocument ? 'comprehensive educational' : 'educational';
    const categoryCount = isLargeDocument ? '5-8' : maxCategories;
    const subtopicCount = isLargeDocument ? '3-5' : maxSubtopics;
    const labelWords = isLargeDocument ? '3-6' : maxLabelWords;

    // const truncatedContent = content.substring(0, contentTruncateLength);
    // const contentSuffix =
    //     content.length > contentTruncateLength
    //         ? isLargeDocument
    //             ? '...(content continues - this is a section of a larger document)'
    //             : '...(content truncated)'
    //         : '';

    return `
You are an expert at creating ${documentType} mind map from ${isLargeDocument ? 'large ' : ''}documents. Analyze the following content  and create a ${isLargeDocument ? 'detailed' : 'comprehensive'} mindmap structure${isLargeDocument ? ' that captures the main themes and relationships' : ''}.

IMPORTANT: Return your response as valid JSON that matches this exact structure:
{
  "nodes": [
    {
      "id": "unique_id",
      "position": {"x": number, "y": number},
      "data": {
        "label": "Main Topic or Subtopic",
        "description":"Summary of the content related to this node",
        "pageStartIndex": "Page start index belonging to this node",
        "pageEndIndex": "Page end index belonging to this node",
        "isRoot": true,
        "color":"#ef4444"
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

IMPORTANT: pageStartIndex and pageEndIndex never exceed total page provider by content.

Guidelines${isLargeDocument ? ' for large document mindmaps' : ''}:
1. Create ${isLargeDocument ? '1 central' : 'a central'} main topic node, only this main topic node will have the isRoot property inside data as true, all other nodes will have isRoot:false
2. Add maximum ${categoryCount} main category nodes connected to the central topic
3. Add maximum ${subtopicCount} subtopic nodes for each main category
4. ${isLargeDocument ? 'Use hierarchical positioning (central -> categories -> subtopics)' : 'Position nodes in a hierarchical layout'}
${isLargeDocument ? '5. Include cross-references between related concepts' : '5. Ensure all node IDs are unique'}
${isLargeDocument ? '6. Use clear, descriptive labels (' + labelWords + ' words per node)' : '6. Connect related concepts with edges'}
${isLargeDocument ? '7. Ensure comprehensive coverage of the document section' : '7. Use clear, concise labels (max ' + labelWords + ' words per node)'}
${isLargeDocument ? '8. Position nodes to avoid overlapping' : ''}
9. Response must be follow language of the content
10. Each node must have a comprehensive summary of the related content including the overall themes and the major ideas covered.
11. Color may be assigned to each node as one of the following strings ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#6b7280'] to the property color inside node data, the provided structure has included a color as an example but root node shouldn't have color, the branches from can have a unifying color to distinguish themselves
12. Color may be assigned to each edge, in this case, if the target node is colored, the edge should be the same color, the color is specified as property color inside edge data, , the provided structure has included a color as an example 
13. Each branch should not be more than 3 nodes deep, exceed this if most other branches also need more than 3 nodes

Content to analyze:
${content}

${customInstructions ? `Additional Instructions: ${customInstructions}\n\n` : ''}Return only the JSON structure, no additional text or formatting.`;
}

export {
    createMindmapPrompt,
    createCustomMindmapPrompt,
    createSimpleMindmapPrompt,
    createDetailedMindmapPrompt,
    createLargeFileMindmapPrompt,
};
