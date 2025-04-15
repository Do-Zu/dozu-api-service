const PROMPT_TEMPLATE = `Create flashcards from the following content. 
              - Format the output as a JSON array of objects with "question" and "answer" fields
              - Limit to maximum 50 flashcards, focusing on the most important concepts
              - Keep definitions clear and concise
              - Extract key terminology and core concepts only
              - Ensure accuracy and educational value
              - Response only in JSON format, no additional text or explanations. Example: [{"question": "question", "define": "your answer"}]`;

const generatePromptText = (content: string): string => {
  return `${PROMPT_TEMPLATE} 
            Content: ${content}`;
};

/**
 * Safely extracts and normalizes JSON data from an API response
 * Handles various response formats including:
 * - Valid JSON
 * - Text with embedded JSON (including code blocks)
 * - Malformed JSON with minor issues
 */
function extractAndNormalizeJson(responseText: string | null | undefined): any[] {
  if (!responseText) return [];

  try {
    // First, try direct parsing
    return normalizeFlashcards(JSON.parse(responseText));
  } catch (error) {
    // If direct parsing fails, try to extract JSON
    try {
      // Look for JSON array pattern
      const jsonMatch = responseText.match(/(\[[\s\S]*\])/);
      if (jsonMatch && jsonMatch[1]) {
        return normalizeFlashcards(JSON.parse(jsonMatch[1]));
      }

      // Look for code block with JSON
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        return normalizeFlashcards(JSON.parse(codeBlockMatch[1]));
      }

      // If still no match, check if it's possibly an object without array brackets
      if (responseText.trim().startsWith('{') && responseText.trim().endsWith('}')) {
        const singleItem = JSON.parse(responseText);
        return normalizeFlashcards([singleItem]);
      }
    } catch (innerError) {
      console.error('Failed to extract JSON:', innerError);
    }

    console.error('Could not parse response into JSON:', responseText);
    return [];
  }
}

/**
 * Ensures flashcard objects have consistent field names
 */
function normalizeFlashcards(data: any[]): any[] {
  if (!Array.isArray(data)) return [];

  return data
    .map(item => {
      const normalized: any = {};

      // Handle question field
      if (item.question) {
        normalized.question = item.question;
      } else if (item.term) {
        normalized.question = item.term;
      } else if (item.front) {
        normalized.question = item.front;
      }

      // Handle answer field
      if (item.answer) {
        normalized.answer = item.answer;
      } else if (item.definition || item.define) {
        normalized.answer = item.definition || item.define;
      } else if (item.back) {
        normalized.answer = item.back;
      }

      return normalized;
    })
    .filter(item => item.question && item.answer); // Only return complete flashcards
}

export { generatePromptText, extractAndNormalizeJson };
