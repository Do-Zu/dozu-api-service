/**
 * Clean and normalize text for consistent processing
 */
export const cleanText = (text: string): string => {
  if (!text) return '';

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

/**
 * Generate n-grams from text
 */
export const generateNGrams = (text: string, maxN: number = 3): string[] => {
  if (!text || text.trim() === '') return [];

  const words = cleanText(text).split(' ');
  const ngramsSet = new Set<string>();

  // Add individual words (unigrams)
  words.forEach(word => ngramsSet.add(word));

  // Generate n-grams
  for (let n = 2; n <= maxN; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      ngramsSet.add(words.slice(i, i + n).join(' '));
    }
  }

  return Array.from(ngramsSet);
};

/**
 * Extract terms with their frequencies from a document
 */
export const extractTerms = (
  document: string,
  maxNGramSize = 3
): { terms: string[]; termFrequency: Record<string, number> } => {
  const ngrams = generateNGrams(document, maxNGramSize);
  const termFrequency: Record<string, number> = {};

  for (const term of ngrams) {
    termFrequency[term] = (termFrequency[term] || 0) + 1;
  }

  return { terms: ngrams, termFrequency };
};
